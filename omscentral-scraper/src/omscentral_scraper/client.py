from __future__ import annotations

from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin
from urllib.request import Request, urlopen


class FetchError(RuntimeError):
    """Raised when OMSCentral cannot be fetched."""


@dataclass(frozen=True)
class OmsCentralClient:
    base_url: str = "https://www.omscentral.com/"
    timeout: float = 30.0
    user_agent: str = "omscs-hub-omscentral-scraper/0.1"

    def fetch_text(self, path: str) -> str:
        url = urljoin(self.base_url, path)
        request = Request(
            url,
            headers={
                "Accept": "text/html,application/xhtml+xml",
                "Accept-Encoding": "identity",
                "User-Agent": self.user_agent,
            },
        )
        try:
            with urlopen(request, timeout=self.timeout) as response:
                charset = response.headers.get_content_charset() or "utf-8"
                return response.read().decode(charset, errors="replace")
        except HTTPError as exc:
            raise FetchError(f"fetch failed: {url} returned HTTP {exc.code}") from exc
        except URLError as exc:
            raise FetchError(f"fetch failed: {url}: {exc.reason}") from exc

