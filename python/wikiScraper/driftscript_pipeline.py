import os
import sys
import json
import urllib.parse
import requests
from bs4 import BeautifulSoup
from pydantic import BaseModel, Field
from typing import List, Dict
from google import genai
from google.genai import types
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize Gemini client
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("Warning: Could not initialize Gemini client. Set GEMINI_API_KEY.", file=sys.stderr)
    client = None
else:
    client = genai.Client(api_key=api_key)

class DataFieldDesc(BaseModel):
    name: str = Field(..., description="Name of the data field (e.g. mass, density)")
    applies_to: str = Field(..., description="The logic object this data field applies to")

class DriftScriptOutput(BaseModel):
    driftscript: List[str] = Field(..., description="List of DriftScript (Lisp-like NAL) statements for the paragraph.")
    new_logic_objects: List[str] = Field(..., description="List of new logic objects encountered in this paragraph (strictly matching Wikipedia link titles).")
    new_data_fields: List[DataFieldDesc] = Field(..., description="List of new data fields and the objects they apply to.")

def fetch_wikipedia_paragraphs(topic: str):
    url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(topic)}"
    headers = {
        "User-Agent": "DriftScriptBot/1.0 (https://garrettstoll.info; mail@garrettstoll.info) Python/requests"
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.text, "html.parser")
    content = soup.find(id="mw-content-text")
    
    paragraphs_data = []
    
    exclude_sections = {"see also", "notes", "references", "external links", "further reading"}
    skip_current_section = False
    
    if content:
        parser_output = content.find(class_="mw-parser-output")
        if parser_output:
            for tag in parser_output.find_all(["h2", "p"]):
                if tag.name == "h2":
                    headline = tag.find(class_="mw-headline")
                    header_text = headline.get_text(strip=True).lower() if headline else tag.get_text(strip=True).lower()
                    
                    if any(ex in header_text for ex in exclude_sections):
                        skip_current_section = True
                    else:
                        skip_current_section = False
                        
                elif tag.name == "p" and not skip_current_section:
                    text = tag.get_text(strip=True)
                    if not text:
                        continue
                    
                    # Extract links that go to /wiki/
                    links = []
                    for a in tag.find_all("a", href=True):
                        href = a["href"]
                        if href.startswith("/wiki/") and ":" not in href:
                            # Grab the title or the text
                            title = a.get("title", a.text).strip()
                            if title and title not in links:
                                links.append(title)
                
                    paragraphs_data.append({
                        "text": text,
                        "linked_topics": links
                    })
                
    return paragraphs_data

def process_paragraph_with_llm(paragraph: dict, global_objects: set, global_data_fields: dict) -> DriftScriptOutput:
    """
    Calls the LLM to translate a paragraph into DriftScript, maintaining state.
    """
    system_prompt = "You are a logical translation assistant. Translate the user's natural language statement into DriftScript, a Lisp-like DSL for Non-Axiomatic Logic."

    user_prompt = f"""
Paragraph Text:
{paragraph['text']}

Topics with Wikipedia Links in this paragraph:
{paragraph['linked_topics']}

CRITICAL CONSTRAINTS:
1. The ONLY logic nodes/terms that should be included as subjects/predicates are topics that have Wikipedia-linked pages (provided above) AND data fields. 
2. Maintain and build upon the existing list of logic objects and data fields.
3. You must output valid DriftScript statements. Use variables where appropriate (e.g., $var).
4. Only use Non-Axiomatic Logic (NAL) levels 1-7.

Existing Logic Objects:
{list(global_objects) if global_objects else "None"}

Existing Data Fields (and what they apply to):
{json.dumps(global_data_fields, indent=2) if global_data_fields else "None"}

Analyze the paragraph one sentence at a time. Translate the knowledge into DriftScript statements using ONLY the provided linked topics as entities and data fields. Update the lists of logic objects and data fields.
"""

    if not client:
        # Fallback dummy if no client
        return DriftScriptOutput(driftscript=["(believe (inherit \"dummy\" \"dummy\"))"], new_logic_objects=[], new_data_fields=[])

    try:
        response = client.models.generate_content(
            model="gemini-3.1-pro-preview",
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_mime_type="application/json",
                response_schema=DriftScriptOutput,
            )
        )
        return DriftScriptOutput.model_validate_json(response.text)
    except Exception as e:
        print(f"Error during generation: {e}")
        return DriftScriptOutput(driftscript=[], new_logic_objects=[], new_data_fields=[])

def append_to_jsonl(filename: str, paragraph_text: str, result: DriftScriptOutput):
    """
    Appends the successfully translated paragraph to a jsonl file 
    in the exact finetuning format requested by the user.
    """
    if not result.driftscript:
        return
        
    system_msg = "You are a logical translation assistant. Translate the user's natural language statement into DriftScript, a Lisp-like DSL for Non-Axiomatic Logic."
    assistant_content = "\n".join(result.driftscript)
    
    record = {
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": paragraph_text},
            {"role": "assistant", "content": assistant_content}
        ]
    }
    
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    with open(filename, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")

def main():
    if len(sys.argv) < 2:
        print("Usage: python driftscript_pipeline.py <Wikipedia_Topic>")
        sys.exit(1)
        
    topic = sys.argv[1]
    print(f"Fetching Wikipedia page for: {topic}...")
    paragraphs = fetch_wikipedia_paragraphs(topic)
    print(f"Found {len(paragraphs)} paragraphs.")
    
    global_objects = set()
    global_data_fields = {} # dict of field_name -> applies_to
    
    print(f"Processing all {len(paragraphs)} paragraphs through the Gemini pipeline...\n")
    
    jsonl_filename = os.path.join("finetuneData", f"{topic.replace(' ', '_')}_dataset.jsonl")

    for i, p in enumerate(paragraphs):
        print(f"--- Paragraph {i+1} of {len(paragraphs)} ---")
        print(f"Text: {p['text']}")
        print(f"Links: {p['linked_topics']}")
        print("Translating via Gemini...")
        
        result = process_paragraph_with_llm(p, global_objects, global_data_fields)
        
        if result.driftscript:
            append_to_jsonl(jsonl_filename, p["text"], result)
            print(f"> Written to {jsonl_filename}")
            
        print("New Logic Objects:", result.new_logic_objects)
        print("New Data Fields:", [f"{df.name} (applies to: {df.applies_to})" for df in result.new_data_fields])
        
        # Update global state
        global_objects.update(result.new_logic_objects)
        for df in result.new_data_fields:
            global_data_fields[df.name] = df.applies_to
            
        print("="*60)
        
    print("\n--- Final Global State ---")
    print("Logic Objects:", global_objects)
    print("Data Fields:", global_data_fields)

if __name__ == "__main__":
    main()
