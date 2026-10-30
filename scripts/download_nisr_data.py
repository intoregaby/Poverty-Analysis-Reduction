#!/usr/bin/env python3
"""
Download NISR EICV7 data for hackathon demo.

The NISR website requires accepting terms and conditions before download.
This script uses selenium to automate the download process.

Usage:
    python scripts/download_nisr_data.py

Requires:
    pip install selenium webdriver-manager
"""

import os
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

# NISR URLs
EICV7_PAGE = "https://statistics.gov.rw/data-sources/surveys/EICV/integrated-household-living-conditions-survey-7-eicv-7/eicv7-poverty-profile-report-202324"
SOURCE_CACHE_DIR = Path(__file__).resolve().parents[1] / "investigations" / "source-cache"

FILES_TO_DOWNLOAD = {
    "EICV7_Tables_Rwanda_Poverty_Profile.xlsx": "//a[contains(@href, 'EICV7_Tables_Rwanda_Poverty_Profile.xlsx')]",
    "EICV7_Poverty Profile.pdf": "//a[contains(@href, 'EICV7_Poverty Profile.pdf')]",
}


def setup_driver(download_dir: Path) -> webdriver.Chrome:
    """Set up Chrome driver with download directory."""
    chrome_options = Options()
    chrome_options.add_experimental_option("prefs", {
        "download.default_directory": str(download_dir),
        "download.prompt_for_download": False,
        "download.directory_upgrade": True,
        "safebrowsing.enabled": True,
    })
    # chrome_options.add_argument("--headless")  # Uncomment for headless mode
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=chrome_options)


def wait_for_download(download_dir: Path, filename: str, timeout: int = 120) -> bool:
    """Wait for file to appear in download directory."""
    filepath = download_dir / filename
    for _ in range(timeout):
        if filepath.exists() and filepath.stat().st_size > 0:
            return True
        time.sleep(1)
    return False


def main():
    SOURCE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    
    print(f"Downloading NISR EICV7 data to {SOURCE_CACHE_DIR}")
    print("=" * 60)
    
    driver = setup_driver(SOURCE_CACHE_DIR)
    
    try:
        driver.get(EICV7_PAGE)
        wait = WebDriverWait(driver, 30)
        
        # Wait for page to load
        wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        print("Page loaded")
        
        # Look for terms and conditions acceptance
        # The page mentions "Terms of use" - look for accept buttons
        try:
            accept_btn = wait.until(EC.element_to_be_clickable((
                By.XPATH, "//button[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'accept') or contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), 'agree')]"
            )))
            accept_btn.click()
            print("Accepted terms and conditions")
            time.sleep(2)
        except:
            print("No explicit accept button found, continuing...")
        
        # Download each file
        for filename, xpath in FILES_TO_DOWNLOAD.items():
            print(f"\nDownloading: {filename}")
            filepath = SOURCE_CACHE_DIR / filename
            
            # Remove existing file
            if filepath.exists():
                filepath.unlink()
            
            try:
                link = wait.until(EC.element_to_be_clickable((By.XPATH, xpath)))
                link.click()
                print(f"  Clicked download link")
                
                if wait_for_download(SOURCE_CACHE_DIR, filename):
                    print(f"  ✓ Downloaded: {filename} ({filepath.stat().st_size} bytes)")
                else:
                    print(f"  ✗ Timeout waiting for download")
                    
            except Exception as e:
                print(f"  ✗ Error downloading {filename}: {e}")
        
        print("\n" + "=" * 60)
        print("Download complete!")
        for filename in FILES_TO_DOWNLOAD:
            filepath = SOURCE_CACHE_DIR / filename
            if filepath.exists():
                print(f"  ✓ {filename} ({filepath.stat().st_size} bytes)")
            else:
                print(f"  ✗ {filename} (NOT FOUND)")
                
    finally:
        driver.quit()


if __name__ == "__main__":
    main()