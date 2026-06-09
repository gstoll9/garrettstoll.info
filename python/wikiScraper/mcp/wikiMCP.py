"""MCP server for Selenium-driven web interaction and model-ready page snapshots.

This server is designed for browser-based data extraction workflows where both
visual page context (screenshot) and structural context (HTML) are needed by a
downstream model pipeline.
"""

# pyright: reportMissingImports=false

from __future__ import annotations

import base64
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup
from mcp.server.fastmcp import FastMCP
from selenium import webdriver
from selenium.common.exceptions import NoSuchElementException, TimeoutException
from selenium.webdriver import ChromeOptions
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager


mcp = FastMCP("selenium-wiki-scraper")


@dataclass
class BrowserSession:
	"""Manages a single Selenium browser session used by all MCP tools."""

	driver: webdriver.Chrome | None = None
	wait_seconds: int = 12
	screenshot_dir: Path = field(
		default_factory=lambda: Path(__file__).resolve().parent / "data" / "screenshots"
	)

	def ensure_driver(self, headless: bool = True) -> webdriver.Chrome:
		if self.driver is not None:
			return self.driver

		self.screenshot_dir.mkdir(parents=True, exist_ok=True)

		options = ChromeOptions()
		if headless:
			options.add_argument("--headless=new")
		options.add_argument("--window-size=1600,1200")
		options.add_argument("--disable-gpu")
		options.add_argument("--no-sandbox")
		options.add_argument("--disable-dev-shm-usage")

		service = Service(ChromeDriverManager().install())
		self.driver = webdriver.Chrome(service=service, options=options)
		return self.driver

	def require_driver(self) -> webdriver.Chrome:
		if self.driver is None:
			raise RuntimeError("No browser session. Call start_browser first.")
		return self.driver

	def close(self) -> None:
		if self.driver is not None:
			self.driver.quit()
			self.driver = None


SESSION = BrowserSession()


def _ensure_http(url: str) -> str:
	if url.startswith("http://") or url.startswith("https://"):
		return url
	return f"https://{url}"


def _model_payload(*, include_html: bool, include_screenshot_b64: bool) -> dict[str, Any]:
	driver = SESSION.require_driver()
	payload: dict[str, Any] = {
		"url": driver.current_url,
		"title": driver.title,
		"timestamp": int(time.time()),
	}

	if include_html:
		payload["html"] = driver.page_source

	if include_screenshot_b64:
		png_bytes = driver.get_screenshot_as_png()
		payload["screenshot_b64"] = base64.b64encode(png_bytes).decode("utf-8")

	return payload


@mcp.tool()
def start_browser(headless: bool = True, wait_seconds: int = 12) -> dict[str, Any]:
	"""Start a Selenium browser session."""
	SESSION.wait_seconds = wait_seconds
	driver = SESSION.ensure_driver(headless=headless)
	return {
		"status": "started",
		"headless": headless,
		"wait_seconds": wait_seconds,
		"session_url": driver.current_url,
	}


@mcp.tool()
def close_browser() -> dict[str, str]:
	"""Close the active browser session."""
	SESSION.close()
	return {"status": "closed"}


@mcp.tool()
def open_url(url: str) -> dict[str, Any]:
	"""Open a URL in the active session."""
	driver = SESSION.require_driver()
	target = _ensure_http(url)
	driver.get(target)
	return {"url": driver.current_url, "title": driver.title}


@mcp.tool()
def click_css(selector: str, timeout_seconds: int | None = None) -> dict[str, Any]:
	"""Click an element by CSS selector."""
	driver = SESSION.require_driver()
	timeout = timeout_seconds or SESSION.wait_seconds
	wait = WebDriverWait(driver, timeout)
	element = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, selector)))
	element.click()
	return {"clicked": selector, "url": driver.current_url, "title": driver.title}


@mcp.tool()
def type_css(
	selector: str,
	text: str,
	clear_first: bool = True,
	press_enter: bool = False,
	timeout_seconds: int | None = None,
) -> dict[str, Any]:
	"""Type text into an input element by CSS selector."""
	driver = SESSION.require_driver()
	timeout = timeout_seconds or SESSION.wait_seconds
	wait = WebDriverWait(driver, timeout)
	element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))

	if clear_first:
		element.clear()
	element.send_keys(text)
	if press_enter:
		element.send_keys(Keys.ENTER)

	return {
		"typed": text,
		"selector": selector,
		"press_enter": press_enter,
		"url": driver.current_url,
	}


@mcp.tool()
def wait_for_css(selector: str, timeout_seconds: int | None = None) -> dict[str, Any]:
	"""Wait until an element exists in the DOM."""
	driver = SESSION.require_driver()
	timeout = timeout_seconds or SESSION.wait_seconds
	wait = WebDriverWait(driver, timeout)
	wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, selector)))
	return {"found": selector, "url": driver.current_url}


@mcp.tool()
def snapshot_page(
	include_html: bool = True,
	include_screenshot_b64: bool = True,
	save_screenshot_file: bool = True,
	screenshot_name: str | None = None,
) -> dict[str, Any]:
	"""Capture model-ready page data (HTML + screenshot)."""
	driver = SESSION.require_driver()
	payload = _model_payload(
		include_html=include_html,
		include_screenshot_b64=include_screenshot_b64,
	)

	if save_screenshot_file:
		stamp = screenshot_name or f"screenshot_{int(time.time())}.png"
		if not stamp.endswith(".png"):
			stamp = f"{stamp}.png"
		out_path = SESSION.screenshot_dir / stamp
		driver.save_screenshot(str(out_path))
		payload["screenshot_path"] = str(out_path)

	return payload


@mcp.tool()
def wikipedia_search(query: str) -> dict[str, Any]:
	"""Open Wikipedia and run a search query."""
	driver = SESSION.require_driver()
	driver.get("https://en.wikipedia.org/wiki/Main_Page")

	wait = WebDriverWait(driver, SESSION.wait_seconds)
	search_box = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "input#searchInput")))
	search_box.clear()
	search_box.send_keys(query)
	search_box.send_keys(Keys.ENTER)

	return {
		"query": query,
		"url": driver.current_url,
		"title": driver.title,
	}


@mcp.tool()
def wikipedia_open_first_result() -> dict[str, Any]:
	"""Open the first result on a Wikipedia search page."""
	driver = SESSION.require_driver()
	wait = WebDriverWait(driver, SESSION.wait_seconds)

	# Special: if search lands directly on an article, no result list is present.
	if "search=" not in driver.current_url:
		return {
			"status": "already_on_article",
			"url": driver.current_url,
			"title": driver.title,
		}

	try:
		first_result = wait.until(
			EC.element_to_be_clickable((By.CSS_SELECTOR, ".mw-search-results li .mw-search-result-heading a"))
		)
	except TimeoutException as exc:
		raise RuntimeError("No clickable search result found on current Wikipedia page.") from exc

	href = first_result.get_attribute("href")
	first_result.click()
	return {
		"clicked_result": href,
		"url": driver.current_url,
		"title": driver.title,
	}


@mcp.tool()
def wikipedia_scrape_article(
	query: str,
	open_first_result: bool = True,
	include_html: bool = True,
	include_screenshot_b64: bool = True,
) -> dict[str, Any]:
	"""Run Wikipedia search flow and return model-ready page snapshot payload."""
	wikipedia_search(query=query)
	if open_first_result:
		wikipedia_open_first_result()

	payload = snapshot_page(
		include_html=include_html,
		include_screenshot_b64=include_screenshot_b64,
		save_screenshot_file=True,
		screenshot_name=f"wiki_{query.lower().replace(' ', '_')}_{int(time.time())}",
	)
	payload["query"] = query
	return payload


@mcp.tool()
def extract_links(limit: int = 25, same_domain_only: bool = True) -> dict[str, Any]:
	"""Extract visible links from the current page using HTML parsing."""
	driver = SESSION.require_driver()
	soup = BeautifulSoup(driver.page_source, "html.parser")

	current = driver.current_url
	domain = current.split("/")[2] if "//" in current else ""

	links: list[dict[str, str]] = []
	for a in soup.select("a[href]"):
		href = (a.get("href") or "").strip()
		text = a.get_text(" ", strip=True)
		if not href:
			continue

		if href.startswith("/"):
			href = f"https://{domain}{href}"

		if same_domain_only and "//" in href and domain and domain not in href:
			continue

		links.append({"text": text[:120], "href": href})
		if len(links) >= limit:
			break

	return {"url": current, "count": len(links), "links": links}


@mcp.tool()
def click_link_by_text(partial_text: str) -> dict[str, Any]:
	"""Click the first link containing the provided visible text."""
	driver = SESSION.require_driver()
	candidates = driver.find_elements(By.TAG_NAME, "a")

	for link in candidates:
		txt = (link.text or "").strip()
		if partial_text.lower() in txt.lower() and link.is_displayed():
			href = link.get_attribute("href")
			link.click()
			return {
				"clicked_text": txt,
				"clicked_href": href,
				"url": driver.current_url,
				"title": driver.title,
			}

	raise NoSuchElementException(f"No visible link contains text: {partial_text}")


@mcp.tool()
def current_page_summary(max_text_chars: int = 1200) -> dict[str, Any]:
	"""Return a lightweight text summary of the current page for prompt context."""
	driver = SESSION.require_driver()
	soup = BeautifulSoup(driver.page_source, "html.parser")

	heading = soup.select_one("h1")
	paragraphs = [p.get_text(" ", strip=True) for p in soup.select("p") if p.get_text(strip=True)]
	combined = "\n\n".join(paragraphs)

	return {
		"url": driver.current_url,
		"title": driver.title,
		"heading": heading.get_text(" ", strip=True) if heading else "",
		"text_excerpt": combined[:max_text_chars],
	}


if __name__ == "__main__":
	mcp.run()
