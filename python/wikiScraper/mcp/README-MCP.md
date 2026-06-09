# Selenium MCP Web Scraper (Wikipedia starter)

This MCP server lets a model pipeline control web browsing through Selenium,
while collecting both:

- Screenshots
- Raw page HTML

It is designed for workflows like:

1. Open/search pages
2. Click links/buttons and interact with inputs
3. Capture model-ready snapshot payloads

## Files

- `wikiMCP.py`: MCP server implementation
- `requirements-mcp.txt`: Python dependencies

## Install

From `python/wikiScraper`:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements-mcp.txt
```

## Run MCP server

```bash
python wikiMCP.py
```

## Core MCP tools

- `start_browser(headless=True, wait_seconds=12)`
- `open_url(url)`
- `click_css(selector)`
- `type_css(selector, text, clear_first=True, press_enter=False)`
- `wait_for_css(selector)`
- `snapshot_page(include_html=True, include_screenshot_b64=True, save_screenshot_file=True)`
- `extract_links(limit=25, same_domain_only=True)`
- `click_link_by_text(partial_text)`
- `current_page_summary(max_text_chars=1200)`

## Wikipedia flow tools

- `wikipedia_search(query)`
- `wikipedia_open_first_result()`
- `wikipedia_scrape_article(query, open_first_result=True, include_html=True, include_screenshot_b64=True)`

Example flow:

1. `start_browser`
2. `wikipedia_search("Selenium software")`
3. `wikipedia_open_first_result`
4. `snapshot_page`
5. Feed `html` and `screenshot_b64` into your model pipeline

## Output artifacts

Screenshots are saved to:

- `python/wikiScraper/data/screenshots/`

The `snapshot_page` tool also returns:

- `url`
- `title`
- `html` (if enabled)
- `screenshot_b64` (if enabled)
- `screenshot_path` (if file save enabled)

## Notes

- For dynamic pages, use `wait_for_css` before snapshotting.
- For non-Wikipedia targets, use generic tools (`open_url`, `click_css`, `type_css`).
- In headed mode (`headless=False`), the browser opens visibly for debugging.
