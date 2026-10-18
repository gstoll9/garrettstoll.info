import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import pandas as pd
from typing import List, Dict, Tuple, Optional, Any
import re
import copy
import os
import json
import urllib

def getInfoBox(soup, baseurl):
    
    table = soup.select_one('table.infobox')
    if not table:
        print("No infobox found on the page.")
        return None
    
    rows = table.find_all('tr')

    data = []
    current_header = "General"

    for row in rows:
        # Check if this row is an infobox header
        header_cell = row.find('th', class_='infobox-header')
        if header_cell:
            current_header = header_cell.get_text(strip=True)
            continue
        
        th = row.find('th')
        td = row.find('td', class_='infobox-data')
        
        if th and td:
            label = th.get_text(strip=True)
            
            list_items = td.find_all('li')
            containers = list_items if list_items else [td]
            
            values_list = []
            links_list = []
            citations_list = []
            
            for container_orig in containers:
                # Make a deep copy to avoid destroying citations in the original soup object
                # if this cell is executed multiple times!
                container = copy.copy(container_orig)
                
                # Extract citations: Look for sup tags that contain bracketed numbers/letters or have class reference
                cites = []
                for sup in container.find_all('sup'):
                    cls = sup.get('class', [])
                    if 'reference' in cls or 'cite_ref' in cls or (sup.get_text() and re.match(r'^\[\w+\]$', sup.get_text().strip())):
                        cites.append(sup.get_text(strip=True))
                        sup.decompose()
                
                # Extract links, ignoring units (heuristic: ignoring short strings or numbers)
                lnks = []
                for a in container.find_all('a'):
                    link_text = a.get_text(strip=True)
                    link_href = a.get('href', '')
                    # Simple heuristic to exclude typical unit/symbol links
                    if len(link_text) > 2 and not any(char.isdigit() for char in link_text):
                        if link_href:
                            full_url = urljoin(baseurl, link_href)
                            lnks.append(full_url)
                
                # Re-get the value after decomposing citations in the temporary copy
                # Also remove parenthetical text which usually contains redundant conversions/units
                value_clean = container.get_text(separator=' ', strip=True)
                #value_clean = re.sub(r'\s*\([^)]*\)', '', value_clean).strip()
                
                # If after stripping units it becomes empty, we might want to skip it, 
                # but we shouldn't lose the citations if it had any.
                # We can merge its citations into the previous item in the list.
                if not value_clean:
                    if cites and citations_list:
                        # Append these citations to the previous item's citations
                        prev_cites = citations_list[-1]
                        if prev_cites:
                            citations_list[-1] = prev_cites + ", " + ", ".join(cites)
                        else:
                            citations_list[-1] = ", ".join(cites)
                    continue
                    
                values_list.append(value_clean)
                links_list.append(", ".join(lnks) if lnks else None)
                citations_list.append(", ".join(cites) if cites else None)
                
            if not values_list:
                continue
            
            value_out = values_list if list_items else (values_list[0] if values_list else None)
            links_out = links_list if list_items else (links_list[0] if links_list else None)
            cites_out = citations_list if list_items else (citations_list[0] if citations_list else None)
            
            # Collect links from the row label (<th>) as a list of absolute URLs
            label_links = [
                urljoin(baseurl, a.get('href'))
                for a in th.find_all('a', href=True)
                if a.get('href')
            ]
            # Optional de-dup while preserving order
            label_links = list(dict.fromkeys(label_links))

            data.append({
                'Metadata': current_header,
                'Label': label,
                'Label Links': label_links,
                'Value': value_out,
                'Links': links_out,
                'Citations': cites_out
            })

    df = pd.DataFrame(data)
    df.set_index(['Metadata', 'Label'], inplace=True)
    return df

def format_list(list_tag, indent_level=0):
    """
    Recursively formats a BeautifulSoup ul/ol element.
    Ordered list items have numbers: "1. ", "2. ", etc.
    Unordered list items have: "-- ".
    Nested levels are indented by 2 * indent_level spaces.
    """
    lines = []
    is_ol = (list_tag.name == 'ol')
    item_index = 1
    
    for child in list_tag.contents:
        if hasattr(child, 'name') and child.name == 'li':
            # Separate immediate text from child lists
            li_text_parts = []
            nested_tags = []
            
            for item in child.contents:
                if hasattr(item, 'name'):
                    if item.name in ('ul', 'ol'):
                        nested_tags.append(item)
                    else:
                        li_text_parts.append(item.get_text())
                else:
                    li_text_parts.append(str(item))
                    
            raw_item_text = "".join(li_text_parts)
            item_text = " ".join(raw_item_text.split())
            
            prefix = f"{item_index}. " if is_ol else "-- "
            indent = "  " * indent_level
            
            if item_text:
                lines.append(f"{indent}{prefix}{item_text}")
            
            # Process nested lists recursively
            for nested in nested_tags:
                lines.extend(format_list(nested, indent_level + 1))
            
            item_index += 1
    return lines

def clean_wiki_link_text(text: str) -> str:
    """
    Cleans a Wikipedia link text by removing parenthetical content, trailing underscores,
    and ignoring anything after a '#' character representation.
    E.g., "Eris_(dwarf_planet)#Discovery" -> "Eris", "Venus_(planet)" -> "Venus"
    """
    # Ignore anything after a #
    text = text.split('#')[0]
    if text.startswith("List_of_") or text.startswith("Lists_of_") or text.startswith("Table_of_") or text.startswith("Outline_of_") or text.startswith("Index_of_") or text.startswith("Timeline_of_"):
        return None  # Skip cleaning for list pages
    cleaned_text = re.sub(r'_\([^)]+\)|\([^)]+\)', '', text)
    cleaned_text = cleaned_text.rstrip('_')
    return cleaned_text

def get_topic_from_href(href: str) -> Optional[str]:
    if not href:
        return None
    base_href = href.split("#")[0]
    
    # Normalize absolute domain links to relative paths
    if base_href.startswith("https://en.wikipedia.org/wiki/"):
        base_href = base_href[len("https://en.wikipedia.org/wiki/"):]
    elif base_href.startswith("http://en.wikipedia.org/wiki/"):
        base_href = base_href[len("http://en.wikipedia.org/wiki/"):]
    elif base_href.startswith("//en.wikipedia.org/wiki/"):
        base_href = base_href[len("//en.wikipedia.org/wiki/"):]
    elif base_href.startswith("/wiki/"):
        base_href = base_href[len("/wiki/"):]
    elif base_href.startswith("./"):
        base_href = base_href[len("./"):]
    else:
        # Ignore external or non-wiki links
        return None
        
    # Check if namespace is included (e.g. Help:Category or File:xyz)
    if ":" in base_href:
        return None
        
    url_text = urllib.parse.unquote(base_href)
    return clean_wiki_link_text(url_text)

def extract_links_from_tag(tag) -> List[str]:
    """
    Extracts and cleans Wikipedia links from a BeautifulSoup tag.
    Returns a list of cleaned link texts.
    """
    links = []
    for a in tag.find_all("a", href=True):
        cleaned_text = get_topic_from_href(a["href"])
        if cleaned_text and cleaned_text not in links:
            links.append(cleaned_text)
    return links

def get_list_item_text(li) -> str:
    li_copy = remove_citations(li)

    for nested_list in li_copy.find_all(["ul", "ol"]):
        nested_list.decompose()

    for hidden_tag in li_copy.find_all(["style", "script", "noscript"]):
        hidden_tag.decompose()

    return re.sub(r"\s+", " ", li_copy.get_text(" ", strip=True)).strip()

def build_list_value(list_element):
    items = []
    for li in list_element.find_all("li", recursive=False):
        item_parts = []

        item_text = get_list_item_text(li)
        if item_text:
            item_parts.append(item_text)

        for child_list in li.find_all(["ul", "ol"], recursive=False):
            nested_value = build_list_value(child_list)
            if nested_value:
                item_parts.append(nested_value)

        if not item_parts:
            continue

        if len(item_parts) == 1:
            items.append(item_parts[0])
        else:
            items.append(tuple(item_parts))

    if not items:
        return None

    return items if list_element.name.lower() == "ul" else tuple(items)

def extract_links_and_logic_objects(base_url: str, element) -> Tuple[List[Tuple[str, str]], List[str]]:
    links: List[Tuple[str, str]] = []
    logic_objects: List[str] = []

    # bold words
    for b in element.find_all("b"):
        bold_text = b.get_text(" ", strip=True)
        if bold_text:
            bold_text = bold_text.replace(" ", "_")
            if not bold_text.isnumeric() and bold_text not in logic_objects:
                logic_objects.append(bold_text)

    # links
    for a in element.find_all("a", href=True):
        href = a["href"]
        if href.startswith("#cite_note-"):
            continue

        link_text = a.get_text(" ", strip=True)
        link_url = urljoin(base_url, href)
        if link_url.split("#")[0] != base_url.split("#")[0]:
            links.append((link_text, link_url))
            topic = get_topic_from_href(href)
            if topic:
                logic_objects.append(topic)

    return links, logic_objects

def remove_citations(element):
    element_copy = copy.copy(element)

    for anchor in element_copy.find_all("a", href=True):
        if anchor["href"].startswith("#cite_note-"):
            anchor.decompose()

    return element_copy

def get_wikipedia_body(soup):
    body = soup.find(id="bodyContent")
    if body is None:
        body = soup.find(class_="mw-body-content")
    if body is None:
        body = soup.find(id="mw-content-text")
    if body is None:
        raise ValueError("Could not find Wikipedia body content (id=bodyContent or class=mw-body-content).")
    
    return body

def wikipedia_to_dataframe(base_url: str, soup) -> pd.DataFrame:
    """Parse headers, paragraphs, and lists; merge a paragraph with an immediately following list."""
    body = get_wikipedia_body(soup)
    rows: List[Dict[str, Any]] = []

    h1 = soup.find('h1')
    if h1 is not None:
        h1 = h1.get_text()
    heading_state: Dict[str, Optional[str]] = {"h1": h1, **{f"h{i}": None for i in range(2, 7)}}

    ul_counter = 0
    ol_counter = 0
    
    pending_paragraph_row: Optional[Dict[str, Any]] = None

    for element in body.find_all(["h2", "h3", "h4", "h5", "h6", "p", "ul", "ol"]):
        if element.find_parent("table") is not None:
            continue

        tag = element.name.lower()
        if tag in {"ul", "ol"} and element.find_parent("li") is not None:
            continue

        if tag not in {"ul", "ol"} and pending_paragraph_row is not None:
            rows.append(pending_paragraph_row)
            pending_paragraph_row = None

        if tag.startswith("h"):
            level = int(tag[1])
            heading_text = element.get_text(" ", strip=True)
            if not heading_text:
                continue

            heading_state[f"h{level}"] = heading_text
            for deeper in range(level + 1, 7):
                heading_state[f"h{deeper}"] = None
            continue

        links, logic_objects = extract_links_and_logic_objects(base_url, element)

        if tag == "p":
            text = remove_citations(element).get_text(" ", strip=True)
            if not text:
                continue

            pending_paragraph_row = {f"h{i}": heading_state[f"h{i}"] for i in range(1, 7)}
            pending_paragraph_row["listID"] = None
            pending_paragraph_row["tableID"] = None
            pending_paragraph_row["text"] = text
            pending_paragraph_row["list"] = None
            pending_paragraph_row["links"] = links
            pending_paragraph_row["logic_objects"] = logic_objects
            continue

        if tag in {"ul", "ol"}:
            element = remove_citations(element)
            items = build_list_value(element)
            if not items:
                continue

            if tag == "ul":
                ul_counter += 1
                list_id = f"ul{ul_counter}"
            else:
                ol_counter += 1
                list_id = f"ol{ol_counter}"

            if pending_paragraph_row is not None:
                row = pending_paragraph_row
                row["links"] = row["links"] + links
                row["logic_objects"] = row["logic_objects"] + logic_objects
                pending_paragraph_row = None
            else:
                row = {f"h{i}": heading_state[f"h{i}"] for i in range(1, 7)}
                row["listID"] = None
                row["tableID"] = None
                row["text"] = None
                row["list"] = None
                row["links"] = links
                row["logic_objects"] = logic_objects

            row["listID"] = list_id
            row["list"] = items
            rows.append(row)
            continue

    if pending_paragraph_row is not None:
        rows.append(pending_paragraph_row)

    columns = ["h1", "h2", "h3", "h4", "h5", "h6", "text", "listID", "list", "links", "logic_objects"]
    return pd.DataFrame(rows, columns=columns)

def get_wikipedia_paragraphs(soup) -> pd.DataFrame:
    content = soup.find(id="mw-content-text")
    
    paragraphs_data = []
    all_logic_objects = set()
    
    exclude_sections = {"see also", "notes", "references", "external links", "further reading"}
    skip_current_section = False
    current_headers = []
    
    if content:
        parser_output = content.find(class_="mw-parser-output")
        if parser_output:
            
            # Preprocess ALL wiki links in parser_output upfront (ignoring any inside tables)
            for a in parser_output.find_all("a", href=True):
                if a.find_parent("table"):
                    continue
                cleaned_text = get_topic_from_href(a["href"])
                if cleaned_text:
                    a.string = cleaned_text
                    all_logic_objects.add(cleaned_text)
            
            header_tags = ["h2", "h3", "h4", "h5", "h6"]
            last_item_was_paragraph = False
            
            for tag in parser_output.find_all(header_tags + ["p", "ul", "ol"]):
                if tag.find_parent("table"):
                    continue
                
                if tag.name in header_tags:
                    headline = tag.find(class_="mw-headline")
                    header_text = headline.get_text(strip=True) if headline else tag.get_text(strip=True)
                    
                    level = int(tag.name[1])
                    current_headers = [h for h in current_headers if h[0] < level]
                    current_headers.append((level, header_text))
                    
                    skip_current_section = False
                    for _, h_text in current_headers:
                        if any(ex in h_text.lower() for ex in exclude_sections):
                            skip_current_section = True
                            break
                    
                    last_item_was_paragraph = False
                        
                elif tag.name == "p" and not skip_current_section:
                    raw_text = tag.get_text()
                    text = " ".join(raw_text.split())
                    if not text:
                        continue
                    
                    # Extract links specifically for this p tag (they have already been converted upfront)
                    links = extract_links_from_tag(tag)
                
                    paragraph_headers = [h[1] for h in current_headers] if current_headers else ["Introduction"]
                    
                    paragraphs_data.append({
                        "headers": paragraph_headers,
                        "text": text,
                        "linked_topics": links
                    })
                    last_item_was_paragraph = True
                    
                elif tag.name in ("ul", "ol") and not skip_current_section:
                    list_lines = format_list(tag, indent_level=0)
                    if not list_lines:
                        continue
                    
                    list_text = "\n".join(list_lines)
                    
                    # Extract links specifically for this list tag (they have already been converted upfront)
                    links = extract_links_from_tag(tag)
                    
                    paragraph_headers = [h[1] for h in current_headers] if current_headers else ["Introduction"]
                    
                    if last_item_was_paragraph and paragraphs_data:
                        # Follows directly after a paragraph: merge it!
                        paragraphs_data[-1]["text"] = paragraphs_data[-1]["text"] + "\n" + list_text
                        for link in links:
                            if link not in paragraphs_data[-1]["linked_topics"]:
                                paragraphs_data[-1]["linked_topics"].append(link)
                    else:
                        # Follows after a header: make it its own paragraph!
                        paragraphs_data.append({
                            "headers": paragraph_headers,
                            "text": list_text,
                            "linked_topics": links
                        })
                        last_item_was_paragraph = False
                
    return paragraphs_data, all_logic_objects

def fetch_wikipedia_paragraphs(topic: str):
    soup = fetch_wikipedia(topic)
    return get_wikipedia_paragraphs(soup)

def fetch_wikipedia(topic: str):
    """
    Fetches paragraphs and links from a Wikipedia page for the given topic.
    Returns a list of paragraphs (with text and linked topics) and a set of all logic objects.
    """
    url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(topic)}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    
    soup = BeautifulSoup(response.text, "html.parser")

    return soup

def get_wikipedia_citations(soup) -> pd.DataFrame:
    # 3. Find Wikipedia's references list ordered-lists (<ol>)
    ref_sect = soup.find(id="References")
    if not ref_sect:
        raise ValueError("Could not find the References section.")
    ref_sect = ref_sect.find_next("ol")
    if not ref_sect:
        raise ValueError("Could not find the ordered list in the References section.")
    ref_cites = ref_sect.find_all("cite") 
    if not ref_cites:
        raise ValueError("Could not find any citations in the References section.")
    
    citations_data = []
    
    for cite in ref_cites:
        # Extract and clean up the citation text
        text = cite.text
        
        # Extract and resolve all links in this citation
        links = []
        for a in cite.find_all("a", href=True):
            href = a["href"]
            # Resolve relative pathways (e.g. "./Earth#cite_note..." -> fully qualified URLs)
            if href not in links:
                links.append(href)
        
        citations_data.append({
            "text": text,
            "links": links
        })
            
    return pd.DataFrame(citations_data)

def save_wikipedia(topic, soup=None, paragraphs=None, logic_objects=None, citations_df=None, directory=None):
    """
    Saves the Wikipedia page content to an HTML file for offline inspection.
    Optionally saves paragraphs, logic objects, and citations to a JSON file.
    """

    if soup is None:
        soup = fetch_wikipedia(topic)
    
    topic = topic.replace(' ', '_')
    if not directory:
        directory = os.path.dirname(os.path.abspath(__file__)) + f'/artifacts/wikipedia_pages/{topic}/'
    os.makedirs(directory, exist_ok=True)

    html_path = os.path.join(directory, f"{topic}.html")  
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(str(soup))
        print(f"Wikipedia page saved to {html_path}")
    
    if paragraphs is not None:
        paragraphs_path = os.path.join(directory, f"{topic}.pkl")
        paragraphs.to_pickle(paragraphs_path)
        print(f"Paragraphs saved to {paragraphs_path}")
    
    if citations_df is not None:
        citations_path = os.path.join(directory, f"{topic}_citations.json")
        citations_df.to_json(citations_path, orient="records", indent=2)
        print(f"Citations saved to {citations_path}")

    return directory
    

def full_parse_wikipedia(topic: str):
    """
    Fetches the Wikipedia page for the given topic and returns the full parsed content.
    Returns a tuple of (soup, paragraphs, logic_objects, citations_df).
    """
    url = f"https://en.wikipedia.org/wiki/{urllib.parse.quote(topic)}"
    soup = fetch_wikipedia(topic)
    paragraphs = wikipedia_to_dataframe(url, soup)
    #paragraphs, all_logic_objects = get_wikipedia_paragraphs(soup)
    citations_df = get_wikipedia_citations(soup)
    save_directory = save_wikipedia(topic, soup=soup, paragraphs=paragraphs, citations_df=citations_df)
    return soup, paragraphs, citations_df, save_directory

