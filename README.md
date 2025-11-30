# **Rakuten In-Store Offer Auto-Adder**

A robust Tampermonkey userscript that automates the tedious process of adding In-Store Cash Back offers on Rakuten. This tool handles page expansion, clicks "Add" on every offer, and verifies that the offer was successfully added before moving to the next one.

## **Features**

* **Auto-Expansion:** Automatically clicks "See More" buttons until all available offers are loaded into the DOM.  
* **Smart Verification:** Clicks "Add" and polls the button state, waiting specifically for the text to change to "Added" to ensure the action registered.  
* **Retry Logic:** Operates in rounds. If a network request fails or an offer times out, the script loops back after the first pass to retry missed items.  
* **Human-like Behavior:** Uses randomized delays between actions to prevent rate-limiting and mimic human interaction.  
* **Overlay UI:**  
  * **Draggable:** Move the panel anywhere on the screen.  
  * **Minimizable:** Collapse the panel into a small chip to save screen space.  
  * **Live Logging:** View real-time status updates and success/error logs directly in the overlay.  
* **Position Memory:** The script remembers where you left the panel and whether it was minimized.

## **Installation**

1. **Install a Userscript Manager:**  
   * **Chrome/Edge:** [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).  
   * **Firefox:** [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) or [Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/).  
2. **Install the Script:**  
   * Create a new script in your manager.  
   * Copy the contents of rakuten-auto-add.user.js (or whatever you named the script file).  
   * Paste it into the editor and save (Ctrl+S).

## **Usage**

1. Navigate to [https://www.rakuten.com/in-store](https://www.rakuten.com/in-store).  
2. You will see a "Rakuten Adder 2.0" panel in the bottom right corner of the screen.  
3. Click **Run**.  
4. The script will:  
   * Expand all "See More" sections.  
   * Iterate through the list, clicking "Add" on every valid offer.  
   * Log successes and errors in the panel window.  
5. Once finished, the status will change to "Done".

## **Configuration**

You can tweak the timing and behavior by editing the CONFIG object at the top of the script:

const CONFIG \= {  
    minDelay: 800,   // Minimum delay between offers (ms)  
    maxDelay: 1800,  // Maximum delay between offers (ms)  
    verifyWait: 5000,// Max time to wait for "Added" text confirmation (ms)  
    expandWait: 2000 // Time to wait after clicking "See More" to let content load  
};  
