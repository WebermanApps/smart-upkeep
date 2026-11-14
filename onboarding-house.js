/* Onboarding house build (Machan Nov 13 7:44 PM; Home Build Motion & Map Deck picks 11:25 PM).
   One band above the step title on every onboarding step. Step 1 uses a taller (~2x) line-art map of Michigan
   (Lower Peninsula and Upper Peninsula), with Wayne, Oakland and Macomb highlighted and pin dots. Other steps keep the 120px house band.
   Step 2 on: one inline SVG house that updates live from the saved onboarding answers: Floors Stack On for stories, Pop In for each system or extra,
   Reveal on the last step. Transform and opacity only, 200-300ms, each change plays once (no loops). prefers-reduced-motion: Quick Fade (opacity only, ~150ms).
   With the phone keyboard open (visualViewport), the band shrinks to a mini strip so the field stays in view.
   Nothing here reads or writes prices, and nothing is sent anywhere. State comes from app.js (window.suHouseState), so it persists with the onboarding state. */
(function () {
  "use strict";
  var NS = "http://www.w3.org/2000/svg";
  var MAP_CROP = "C"; /* Machan 10:22: Whole State With An Inset. A=SE Michigan, B=Lower Peninsula (runner-up; set MAP_CROP to "B" to swap). */
  var MAPS = {
    A: '<svg class="hb-map-svg" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of southeast Michigan, highlighting Wayne, Oakland and Macomb counties"><g fill="#FBF8F2" stroke="#D3CABD" stroke-width=".9" stroke-linejoin="round"><path d="M38.4 -20.0L38.4 -12.4L64.5 -12.3L64.6 -20.0Z"/><path d="M191.0 90.7L191.7 110.5L204.9 110.2L205.5 124.7L206.0 124.9L205.8 125.1L206.7 126.2L208.2 126.0L209.6 127.3L210.6 127.0L211.2 127.8L210.8 129.6L210.4 129.7L209.6 128.9L209.1 130.1L208.7 129.9L208.9 130.9L207.6 130.7L208.3 131.8L206.3 132.9L207.0 133.8L208.3 133.0L209.4 133.3L209.1 134.2L208.4 134.3L207.4 135.9L207.8 135.8L208.0 136.1L209.1 135.1L209.9 135.8L208.2 137.7L208.2 138.7L210.1 136.2L211.1 136.0L212.2 136.7L213.3 136.2L213.6 135.4L216.6 132.2L217.3 129.9L217.3 127.9L219.6 120.5L218.8 116.9L219.6 113.7L219.5 111.0L220.3 108.0L221.7 106.1L222.6 104.2L221.9 102.9L222.2 102.2L221.9 101.1L218.6 94.6L217.7 89.6Z"/><path d="M116.6 -19.8L116.7 -11.9L142.8 -12.1L142.8 -20.0Z"/><path d="M116.7 -11.9L116.8 14.4L143.0 14.3L142.8 -12.1Z"/><path d="M148.9 172.0L149.5 199.2L166.2 198.5L166.3 198.0L165.4 197.9L165.2 197.4L165.5 197.2L164.9 197.1L164.9 196.7L165.4 196.3L165.8 196.6L167.0 196.6L167.1 197.6L167.7 197.9L166.8 194.2L167.0 192.4L168.6 191.3L170.1 188.2L170.7 187.6L171.4 187.8L172.3 187.4L173.5 183.3L175.0 182.4L176.2 182.8L176.5 183.5L177.1 182.4L176.8 181.8L177.3 180.3L178.7 179.1L178.0 179.0L178.2 178.7L178.8 178.6L179.1 179.1L179.7 178.9L179.5 177.1L180.2 177.0L180.6 177.8L181.0 176.8L178.9 174.5L178.4 174.6L178.1 173.8L177.0 173.4L176.9 172.7L176.3 173.0L175.5 171.5L174.8 171.1L168.1 171.2L168.1 171.6Z"/><path d="M167.5 35.6L167.8 35.9L168.4 36.0L167.9 35.5ZM167.5 39.1L168.0 38.9L168.2 39.6L168.0 38.8L167.6 38.6ZM166.7 39.9L166.5 40.6L167.4 40.2ZM166.7 37.1L166.7 38.3L167.1 38.7L167.3 37.1ZM165.9 40.8L166.4 40.8L166.0 40.6L166.8 39.1L166.3 39.3ZM165.5 47.4L165.6 51.8L212.1 50.0L211.9 46.6L211.4 45.1L211.7 43.3L211.1 42.7L210.6 39.3L209.9 38.6L210.0 37.9L209.5 36.6L208.2 35.6L208.0 33.6L205.1 27.6L203.5 25.9L202.6 25.8L202.0 24.8L200.0 23.7L197.5 23.1L195.1 21.4L193.7 21.8L192.8 21.4L191.3 22.8L189.3 23.0L188.3 25.4L187.2 26.3L184.7 26.2L182.6 27.5L176.6 28.4L175.7 31.0L173.6 32.8L168.9 33.0L169.4 33.6L170.4 33.4L173.0 33.9L173.2 35.4L171.6 37.3L169.7 38.1L169.8 39.0L169.2 40.9L167.9 42.4L167.6 42.0L167.5 42.7L167.7 42.4L167.9 42.9L167.5 42.9ZM164.8 44.9L165.3 45.0L165.6 44.8L165.0 44.6Z"/><path d="M13.7 146.5L53.2 146.3L53.1 120.0L17.2 120.0L17.3 125.1L16.1 129.9L16.3 133.2L15.0 141.8Z"/><path d="M117.1 172.9L117.2 200.5L149.5 199.2L148.9 172.0L136.3 172.4L136.3 172.7Z"/><path d="M142.8 -20.0L142.8 -12.1L173.6 -12.3L174.2 -14.6L173.9 -16.3L173.9 -20.0Z"/><path d="M0.6 22.9L3.4 28.8L5.2 40.3L26.4 40.5L26.1 13.9L7.5 13.0L5.2 17.5L1.4 20.8L0.8 21.8Z"/><path d="M-16.1 196.5L16.3 196.5L16.4 159.8L8.8 159.8L5.6 164.9L2.0 169.5L1.4 171.9L-1.6 178.3L-3.0 182.7L-5.1 186.5L-8.5 190.4Z"/><path d="M16.3 196.5L40.2 196.5L39.8 196.0L40.1 195.2L41.0 194.6L41.5 193.5L41.3 173.0L16.4 172.9Z"/><path d="M140.4 85.7L140.9 119.0L153.7 118.9L153.5 112.2L166.3 111.8L165.9 85.5Z"/><path d="M77.8 40.7L78.0 67.0L103.8 67.1L103.9 40.6Z"/><path d="M91.4 93.4L91.4 119.8L117.0 119.9L116.8 93.5Z"/><path d="M77.8 40.7L103.9 40.6L103.8 14.4L77.9 14.1Z"/><path d="M38.4 -12.4L38.2 14.1L64.5 14.0L64.5 -12.3Z"/><path d="M103.8 14.4L103.9 40.6L116.9 40.7L116.9 39.6L127.7 39.8L127.7 14.3Z"/><path d="M26.1 13.9L26.4 40.5L52.2 40.5L52.1 14.0Z"/><path d="M53.1 120.2L53.2 146.3L78.7 146.3L78.6 119.8Z"/><path d="M90.9 67.1L91.0 80.2L91.5 80.2L91.4 93.4L116.8 93.5L116.7 67.1Z"/><path d="M116.8 92.7L117.0 119.4L140.9 119.0L140.6 92.3Z"/><path d="M13.8 93.4L14.7 96.1L16.3 103.3L17.1 112.3L17.2 120.0L40.3 120.0L39.8 86.8L33.5 86.8L33.5 93.4Z"/><path d="M92.0 172.8L92.1 196.5L93.1 196.5L93.1 201.3L117.2 200.5L117.1 172.7Z"/><path d="M145.8 51.9L146.5 51.9L146.6 51.3L146.1 51.3ZM127.6 59.3L134.0 59.4L134.0 62.7L146.6 62.8L146.6 66.1L153.0 66.1L153.0 57.8L152.4 56.8L151.1 55.6L146.7 54.2L146.6 53.6L145.6 52.9L145.1 52.9L144.9 53.7L142.6 52.2L141.4 51.0L140.0 48.1L139.1 44.7L139.8 44.5L140.6 43.5L141.0 40.4L140.8 37.3L141.2 37.0L141.3 34.2L141.6 33.3L134.3 33.3L134.3 26.8L127.7 26.8Z"/><path d="M184.4 80.9L190.8 80.8L191.0 90.7L217.7 89.6L216.6 85.3L215.7 69.3L213.2 61.2L212.5 57.4L212.1 50.0L184.4 51.2L185.2 77.6L184.3 77.6Z"/><path d="M166.9 23.7L166.9 24.4L167.2 24.8L167.7 24.2ZM127.7 14.3L127.7 26.8L134.3 26.8L134.3 33.3L141.6 33.3L142.1 32.4L142.6 32.3L143.4 29.4L144.2 29.1L144.9 27.3L145.5 26.8L146.1 27.2L146.7 26.8L147.5 26.9L147.4 27.6L148.0 27.3L149.5 27.6L150.2 27.2L150.3 26.4L150.9 26.2L152.8 26.6L154.0 27.5L153.5 24.5L154.5 23.4L155.8 22.5L157.2 22.3L159.4 22.8L158.8 20.5L160.3 18.5L160.2 14.1Z"/><path d="M90.7 -12.2L90.6 14.3L116.8 14.4L116.7 -11.9Z"/><path d="M64.5 -12.3L64.5 14.0L90.6 14.3L90.4 -5.5L90.7 -12.2Z"/><path d="M103.9 40.6L103.8 67.1L116.7 67.1L116.7 65.9L127.5 65.9L127.7 39.8L116.9 39.6L116.9 40.7Z"/><path d="M52.1 14.0L52.2 40.5L77.8 40.7L77.9 14.1Z"/><path d="M65.7 93.4L65.9 119.9L91.4 119.8L91.4 93.4Z"/><path d="M66.4 146.5L66.7 172.8L98.3 172.9L97.8 146.3Z"/><path d="M41.2 146.4L41.3 173.0L66.7 172.8L66.4 146.4Z"/><path d="M8.8 159.8L16.4 159.8L16.4 172.9L41.3 173.0L41.2 146.4L13.7 146.5L11.8 152.9Z"/><path d="M66.7 172.8L66.8 196.5L92.1 196.5L92.0 172.8Z"/><path d="M15.9 -19.9L16.6 -16.6L15.8 -12.8L38.4 -12.4L38.4 -20.0Z"/><path d="M142.8 -12.1L143.0 14.3L160.2 14.1L161.5 8.3L163.3 5.8L164.9 5.3L166.3 5.6L167.1 6.5L166.5 7.4L167.8 5.9L168.4 4.2L170.6 1.7L171.1 1.3L172.4 1.4L172.8 1.0L172.8 -1.7L173.5 -4.3L173.1 -6.0L173.6 -12.3Z"/><path d="M3.6 66.8L5.4 74.0L7.1 78.4L13.8 93.4L33.5 93.4L33.5 86.8L39.8 86.8L39.8 80.2L26.4 80.1L26.4 67.0L7.0 66.6Z"/><path d="M153.0 57.8L153.2 85.6L165.9 85.5L165.9 84.8L171.8 84.6L171.6 78.0L185.2 77.6L184.4 51.2L165.6 51.8L165.5 47.1L163.9 49.5L162.7 49.5L163.0 48.9L162.6 48.2L163.1 48.2L162.9 47.9L161.6 48.7L160.9 50.4L160.5 50.3L155.2 57.2L153.7 58.1Z"/><path d="M39.8 80.2L40.3 120.0L65.9 119.9L65.7 80.1Z"/><path d="M165.9 84.8L166.3 111.5L191.7 110.5L190.8 80.8L184.4 80.9L184.3 77.6L171.6 78.0L171.8 84.6Z"/><path d="M64.6 -20.0L64.5 -12.3L90.7 -12.2L90.7 -20.0Z"/><path d="M116.7 65.9L116.8 92.7L140.6 92.3L140.4 85.7L153.2 85.6L153.0 66.1L146.6 66.1L146.6 62.8L134.0 62.7L134.0 59.4L127.6 59.3L127.5 65.9Z"/><path d="M97.8 146.3L98.3 172.9L129.6 172.8L129.6 146.1Z"/><path d="M90.7 -20.0L90.7 -12.2L116.7 -11.9L116.6 -20.0Z"/><path d="M52.2 40.5L52.2 66.9L78.0 67.0L77.8 40.7Z"/><path d="M39.8 196.6L66.8 196.5L66.7 172.8L41.3 173.0L41.5 193.5L41.0 194.6L40.1 195.2L39.8 196.0L40.2 196.5Z"/><path d="M-0.8 54.4L-0.2 57.4L2.6 63.3L3.5 66.6L26.4 67.0L26.4 40.5L5.2 40.3L3.9 45.0L-0.1 51.0Z"/><path d="M128.2 119.4L129.0 137.0L129.1 146.1L154.8 145.6L153.7 118.9Z"/><path d="M52.2 66.9L52.2 80.1L65.7 80.1L65.7 93.4L91.4 93.4L91.5 80.2L91.0 80.2L90.9 67.1Z"/><path d="M7.5 13.0L38.2 14.1L38.4 -12.4L15.8 -12.8L15.0 -10.1L15.1 -5.4L14.0 0.4L10.8 6.6L9.9 7.6L8.9 10.8Z"/><path d="M78.6 119.8L78.7 146.3L104.2 146.3L104.1 119.9Z"/><path d="M129.6 146.1L129.6 172.8L136.3 172.7L136.3 172.4L161.6 171.8L161.0 145.3L139.7 146.1Z"/><path d="M104.1 119.9L104.2 146.3L129.1 146.1L129.0 137.0L128.2 119.4L117.0 119.4L117.0 119.9Z"/><path d="M26.4 40.5L26.4 80.1L52.2 80.1L52.2 40.5Z"/></g><g fill="rgba(193,80,46,.14)" stroke="#C1502E" stroke-width="1.8" stroke-linejoin="round"><path data-county="Wayne" d="M161.0 145.3L180.5 144.5L197.8 144.1L197.2 147.5L196.3 149.0L195.2 149.9L194.7 151.1L192.7 151.3L192.8 151.8L193.3 151.8L193.0 152.5L189.8 153.2L187.4 154.2L185.4 156.5L184.0 160.2L183.6 165.0L184.4 168.8L183.7 171.4L182.3 171.8L181.7 171.5L181.6 172.6L181.0 172.0L180.5 172.4L180.7 174.7L180.0 175.3L178.9 174.5L178.4 174.6L178.4 174.1L177.0 173.4L176.9 172.7L176.3 173.0L175.5 171.5L174.8 171.1L168.1 171.2L168.1 171.6L161.6 171.8Z"/><path data-county="Oakland" d="M153.5 112.2L185.3 110.9L186.3 144.4L154.8 145.6Z"/><path data-county="Macomb" d="M185.3 110.9L204.9 110.2L205.5 124.7L206.8 126.2L204.2 127.5L203.8 128.5L201.8 128.7L200.9 129.7L200.5 131.6L202.0 132.4L202.1 133.1L203.2 133.3L202.4 133.3L202.6 135.4L201.8 135.0L199.8 135.2L197.8 138.2L197.1 142.1L197.8 144.1L186.3 144.4Z"/></g><g font-family="Khand,sans-serif" font-weight="600" fill="#2A241C"><g class="hb-pin"><path d="M175.5 156.9L172.1 151.4A4.0 4.0 0 1 1 178.9 151.4Z" fill="#C1502E"/><circle cx="175.5" cy="149.9" r="1.6" fill="#FFFCF7"/><path d="M175.5 152.9L143.2 166.9" stroke="#8A7F72" stroke-width=".8" fill="none"/><text x="137.5" y="170.9" font-size="12.5" text-anchor="end" stroke="#FFFCF7" stroke-width="3.8" paint-order="stroke" stroke-linejoin="round">Wayne</text></g><g class="hb-pin"><path d="M169.9 128.2L166.5 122.7A4.0 4.0 0 1 1 173.4 122.7Z" fill="#C1502E"/><circle cx="169.9" cy="121.2" r="1.6" fill="#FFFCF7"/><path d="M169.9 124.2L141.0 120.2" stroke="#8A7F72" stroke-width=".8" fill="none"/><text x="135.9" y="124.2" font-size="12.5" text-anchor="end" stroke="#FFFCF7" stroke-width="3.8" paint-order="stroke" stroke-linejoin="round">Oakland</text></g><g class="hb-pin"><path d="M194.5 125.5L191.0 120.0A4.0 4.0 0 1 1 197.9 120.0Z" fill="#C1502E"/><circle cx="194.5" cy="118.5" r="1.6" fill="#FFFCF7"/><path d="M194.5 121.5L220.0 115.5" stroke="#8A7F72" stroke-width=".8" fill="none"/><text x="224.5" y="119.5" font-size="12.5" text-anchor="start" stroke="#FFFCF7" stroke-width="3.8" paint-order="stroke" stroke-linejoin="round">Macomb</text></g></g></svg>',
    B: '<svg class="hb-map-svg" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of Michigan Lower Peninsula, highlighting Wayne, Oakland and Macomb counties"><g fill="#FBF8F2" stroke="#D3CABD" stroke-width=".9" stroke-linejoin="round"><path d="M142.2 14.2L142.3 16.2L143.1 16.2L144.1 14.0L142.5 13.8ZM108.3 21.1L108.9 20.5L107.8 20.1L107.8 20.7ZM109.5 23.1L110.1 23.5L110.5 22.6L109.4 21.5ZM104.9 25.7L105.8 26.7L105.9 25.5L105.3 25.1ZM139.7 27.6L139.8 26.3L139.4 26.1L139.0 26.6ZM137.4 31.6L137.7 29.5L135.9 28.3ZM129.7 43.0L129.9 44.9L131.6 47.0L133.2 46.9L132.5 45.9L132.8 43.9L132.3 42.5L130.2 42.1ZM127.3 49.9L128.7 49.3L128.6 48.3L129.2 48.2L127.8 47.4L127.0 47.8L126.5 49.5ZM178.3 8.3L179.9 8.7L179.2 7.5L178.4 7.1ZM180.3 10.2L180.2 9.8L179.6 9.6L179.7 10.0ZM149.0 11.3L149.3 11.8L148.8 12.2L149.2 12.5L150.6 12.3L150.2 11.9L150.7 11.5L148.2 9.9L148.5 11.1L148.0 11.3ZM153.3 12.7L154.2 11.1L153.6 10.4L153.3 10.5L153.7 11.3L152.7 12.3ZM181.6 11.6L183.4 14.3L186.2 15.1L187.0 14.8L188.4 12.6L186.7 11.9L186.2 10.7L185.7 11.9L183.3 10.7L180.4 10.4L180.6 11.1ZM145.0 21.7L147.7 22.1L149.4 20.5L149.5 19.1L148.9 17.0L149.3 16.1L149.1 14.8L148.3 14.1L148.6 13.7L149.1 13.9L149.0 13.4L147.8 13.6L146.8 13.1L146.6 15.5L145.5 16.9L145.5 18.9L144.7 21.1ZM103.5 205.9L172.9 205.9L172.9 209.0L219.3 207.2L218.5 206.0L219.8 205.9L220.3 206.8L219.9 203.3L220.9 202.6L221.8 200.6L223.2 200.1L224.0 197.5L225.0 197.0L225.9 197.6L226.4 195.6L227.3 194.8L226.9 194.6L227.9 194.7L228.1 193.4L228.6 193.9L228.6 193.0L227.7 192.2L228.5 192.2L228.4 190.6L228.7 190.3L229.1 190.7L229.2 190.0L230.4 190.0L230.9 188.3L230.4 185.9L230.6 182.8L231.6 180.3L232.8 179.1L236.4 177.9L236.2 177.2L237.4 177.1L239.0 174.8L239.5 172.5L239.0 171.4L239.3 169.1L240.7 167.0L242.5 167.1L242.3 165.8L242.8 165.8L241.1 164.7L241.7 163.1L243.2 162.7L243.5 162.0L245.4 161.1L246.9 161.9L247.7 161.9L247.7 163.4L246.9 163.0L246.4 163.6L246.5 164.2L245.6 164.1L246.1 164.8L244.8 165.5L245.3 166.1L246.1 165.5L246.8 165.8L245.5 167.4L246.6 166.9L247.1 167.4L246.0 168.5L246.0 169.2L247.3 167.6L249.3 167.6L251.4 165.0L253.3 157.6L252.8 155.4L253.2 151.6L253.7 149.7L255.1 147.2L254.7 145.3L252.6 141.2L251.4 135.3L250.8 125.1L248.8 117.5L248.2 108.6L246.8 104.3L246.0 103.7L245.9 102.4L243.9 98.4L241.4 96.4L239.3 95.8L237.7 94.7L236.2 94.7L235.3 95.6L234.0 95.7L232.7 97.8L231.1 97.7L229.8 98.5L226.0 99.1L225.4 100.8L224.4 101.8L221.2 102.0L221.4 102.4L223.7 102.6L223.8 103.5L222.8 104.8L221.6 105.3L221.2 107.0L220.4 108.0L220.3 107.7L220.4 108.4L218.1 112.3L217.1 112.5L217.3 111.5L216.4 112.0L213.5 116.1L211.4 118.0L209.7 116.4L207.0 115.5L206.1 114.6L205.8 115.2L203.9 113.9L202.2 110.0L202.2 109.3L203.1 108.4L203.5 102.8L205.8 98.5L207.2 98.1L207.4 98.6L208.8 98.6L209.6 97.7L211.6 98.5L211.3 96.7L211.9 95.9L213.6 95.2L215.1 95.6L214.7 94.1L215.6 92.9L215.5 90.4L216.5 86.0L217.5 84.8L218.5 84.5L219.8 84.9L219.5 85.8L222.1 82.2L223.3 82.0L223.6 81.6L224.4 71.8L224.2 68.6L225.7 63.8L224.8 62.0L224.9 59.0L223.9 56.9L224.1 55.5L222.4 55.0L220.1 53.0L219.0 49.6L219.4 49.2L220.2 49.4L219.3 48.9L219.9 47.1L221.8 46.1L222.4 46.1L222.5 47.0L223.3 47.7L226.0 48.5L225.4 47.6L224.1 47.2L224.0 45.6L224.6 45.3L224.0 44.2L224.1 42.9L223.5 42.9L222.5 41.8L220.8 38.2L220.6 37.4L221.5 37.6L221.9 36.8L219.1 34.4L219.1 33.8L218.3 33.9L218.6 33.1L218.1 32.5L218.0 33.4L216.5 32.5L215.4 33.0L214.4 32.8L210.9 30.6L210.4 29.8L209.5 30.3L207.9 30.0L208.2 29.7L206.6 29.2L203.7 26.4L202.8 26.1L197.5 26.0L196.5 24.8L195.9 22.2L193.2 19.2L189.3 17.8L187.7 18.2L185.9 17.5L186.3 18.3L185.9 18.7L185.4 18.2L184.2 18.1L181.5 15.6L175.8 12.8L175.6 11.8L173.4 12.1L173.9 12.9L172.9 13.9L170.3 13.3L169.5 13.8L168.4 13.2L166.0 13.1L167.7 14.0L168.3 14.8L168.2 15.5L166.5 17.0L166.0 18.1L163.8 19.2L162.2 21.8L162.3 23.8L163.0 26.6L164.1 28.0L166.8 29.6L166.8 29.1L168.9 29.4L169.2 30.7L167.6 31.7L165.0 32.3L161.5 31.8L159.3 32.3L157.7 33.4L157.2 34.4L156.3 34.6L155.9 34.3L153.5 36.7L152.9 39.3L153.2 42.8L153.8 44.4L152.9 52.3L150.3 58.2L148.8 59.6L148.9 60.9L148.1 61.9L146.4 61.3L147.2 58.5L149.1 56.7L149.5 51.8L150.3 51.6L149.9 50.2L148.4 51.0L147.9 53.3L146.9 54.8L147.1 55.2L147.5 54.5L148.2 54.8L146.4 58.6L145.8 61.0L144.3 60.7L144.5 59.4L143.8 57.0L144.8 53.5L145.6 53.4L145.6 50.3L144.6 51.4L143.9 51.0L145.6 48.7L146.0 47.1L146.8 47.7L145.1 43.6L145.6 42.6L146.5 42.3L147.1 43.4L147.0 42.1L148.2 40.7L147.7 39.6L146.1 41.1L145.0 40.8L143.7 42.7L142.8 45.3L140.7 47.2L139.4 49.3L139.4 50.8L138.5 52.2L136.4 52.7L135.4 51.6L134.2 51.3L132.4 54.4L131.6 54.6L130.4 53.9L129.6 54.3L129.6 58.5L128.8 62.2L127.7 62.9L126.5 62.7L123.1 64.6L123.0 66.0L124.3 70.6L123.3 74.7L123.4 77.7L122.7 81.3L117.4 91.7L114.2 95.2L116.0 99.4L117.1 106.3L116.3 109.7L113.5 114.0L113.4 116.4L115.7 122.0L117.2 128.1L123.1 142.1L124.3 148.3L124.8 160.1L124.0 163.6L123.4 170.7L120.6 180.0L118.7 183.8L115.1 188.7L111.3 198.3L108.4 202.0ZM219.5 104.8L219.9 105.7L220.0 104.6ZM219.5 107.0L219.5 106.2L219.7 105.9L219.4 106.0L219.2 106.8L219.2 107.1Z"/></g><g fill="rgba(193,80,46,.14)" stroke="#C1502E" stroke-width="1.4" stroke-linejoin="round"><path data-county="Wayne" d="M216.0 173.4L228.4 172.9L239.4 172.6L239.0 174.8L237.4 177.1L236.2 177.2L236.6 177.5L236.4 177.9L232.8 179.1L231.6 180.5L230.6 182.8L230.4 185.9L230.9 188.3L230.4 190.0L229.2 190.0L229.1 190.7L228.7 190.3L228.4 190.6L228.6 192.0L228.1 192.4L227.1 192.0L227.1 191.7L226.2 191.2L226.1 190.8L225.8 191.0L224.8 189.8L216.4 190.2Z"/><path data-county="Oakland" d="M211.3 152.3L231.4 151.5L232.1 172.8L212.1 173.5Z"/><path data-county="Macomb" d="M231.4 151.5L244.0 151.1L244.3 160.3L245.1 161.2L243.5 162.0L243.2 162.7L242.0 162.8L241.4 163.4L241.1 164.7L242.1 165.2L242.2 165.6L242.8 165.8L242.3 165.8L242.5 167.1L242.0 166.8L240.7 167.0L239.4 168.8L239.0 171.4L239.4 172.6L232.1 172.8Z"/></g><g font-family="Khand,sans-serif" font-weight="600" fill="#2A241C"><g class="hb-pin"><path d="M225.3 180.7L222.5 176.4A3.2 3.2 0 1 1 228.0 176.4Z" fill="#C1502E"/><circle cx="225.3" cy="175.1" r="1.3" fill="#FFFCF7"/><path d="M225.3 177.7L209.3 190.5" stroke="#8A7F72" stroke-width=".7" fill="none"/><text x="205.3" y="196.7" font-size="12" text-anchor="end" stroke="#FFFCF7" stroke-width="3.6" paint-order="stroke" stroke-linejoin="round">Wayne</text></g><g class="hb-pin"><path d="M221.7 162.5L219.0 158.1A3.2 3.2 0 1 1 224.5 158.1Z" fill="#C1502E"/><circle cx="221.7" cy="156.9" r="1.3" fill="#FFFCF7"/><path d="M221.7 159.5L202.5 149.9" stroke="#8A7F72" stroke-width=".7" fill="none"/><text x="197.7" y="150.5" font-size="12" text-anchor="end" stroke="#FFFCF7" stroke-width="3.6" paint-order="stroke" stroke-linejoin="round">Oakland</text></g><g class="hb-pin"><path d="M237.3 160.8L234.6 156.4A3.2 3.2 0 1 1 240.1 156.4Z" fill="#C1502E"/><circle cx="237.3" cy="155.2" r="1.3" fill="#FFFCF7"/><path d="M237.3 157.8L251.7 148.2" stroke="#8A7F72" stroke-width=".7" fill="none"/><text x="255.3" y="148.8" font-size="12" text-anchor="start" stroke="#FFFCF7" stroke-width="3.6" paint-order="stroke" stroke-linejoin="round">Macomb</text></g></g></svg>',
    C: '<svg class="hb-map-svg" viewBox="0 0 360 220" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Map of Michigan with an inset of Wayne, Oakland and Macomb counties"><g fill="#FBF8F2" stroke="#D3CABD" stroke-width=".9" stroke-linejoin="round"><path d="M174.3 75.8L174.7 75.3L175.1 75.8L174.8 76.3ZM171.8 78.2L172.7 76.6L173.5 77.9L174.4 76.6L176.2 76.2L176.4 75.1L175.2 74.7L175.9 74.2L178.5 74.6L179.6 77.2L180.9 77.9L180.0 79.8L179.0 80.1L177.9 79.7L178.0 79.2L177.4 79.6L177.4 78.7L177.2 79.3L175.5 79.6L174.4 78.8L174.0 79.5L173.3 78.8L172.9 79.3ZM156.2 83.2L158.0 83.3L159.6 84.0L159.9 83.3L160.3 84.1L161.4 84.5L160.3 86.0L158.6 85.8ZM154.8 81.7L155.0 81.0L155.9 82.0L155.5 82.2ZM138.4 84.3L139.0 83.7L139.1 83.1L139.2 84.3ZM135.4 83.6L135.7 82.8L137.1 83.8L137.0 84.3L136.1 84.4L136.0 83.7ZM133.4 90.4L134.5 84.9L136.0 85.0L135.6 85.5L136.1 85.9L136.2 89.6L134.7 90.7ZM131.6 85.5L132.8 85.4L132.2 86.8L131.7 86.8ZM127.5 94.6L128.7 95.4L128.5 96.7L128.5 96.3ZM123.7 105.3L124.0 103.5L125.2 103.8L125.8 106.6L124.8 106.7ZM121.5 108.0L122.4 106.9L123.2 107.4L122.4 108.5ZM110.3 90.5L111.1 90.7L110.9 91.5L110.6 91.5ZM109.3 60.5L110.5 60.0L111.1 60.8L110.6 62.3L111.1 62.6L111.5 62.1L111.2 63.2L110.8 63.3L110.8 62.7L109.7 63.2ZM107.6 92.9L108.2 92.8L108.1 93.6L107.6 93.3ZM106.7 209.0L109.8 206.5L111.7 204.1L114.1 198.0L117.7 192.3L119.5 186.4L120.4 179.6L120.1 171.9L119.3 167.9L115.5 158.9L113.0 151.4L113.1 149.8L114.9 147.0L115.4 144.8L114.7 140.4L113.6 137.7L115.6 135.5L119.0 128.8L120.1 121.9L119.3 118.0L123.0 116.5L123.5 111.4L125.3 111.5L126.5 109.4L127.8 110.3L129.2 110.0L129.8 108.1L132.0 105.6L133.4 102.6L134.1 102.8L135.1 101.9L135.4 102.6L134.7 103.5L134.7 104.3L134.4 103.6L133.5 104.5L134.6 107.1L134.1 106.7L132.7 109.2L133.2 109.5L133.8 108.8L133.8 110.8L133.3 110.9L132.7 113.1L133.0 115.5L133.9 115.7L135.5 111.7L134.6 111.7L135.6 109.3L136.6 108.7L136.0 112.9L134.8 114.1L134.3 115.9L135.4 116.3L138.5 110.1L139.1 105.0L138.5 101.7L138.9 100.0L142.6 97.2L144.1 96.9L146.3 97.2L149.0 96.2L148.8 95.3L147.4 95.4L145.7 94.4L144.5 91.7L144.5 90.5L145.5 88.8L147.0 88.1L148.4 86.4L148.0 85.4L146.9 84.8L151.4 85.3L152.0 84.7L151.7 84.2L153.1 84.0L153.3 84.7L156.9 86.4L158.6 88.1L159.8 88.4L159.8 87.7L162.0 87.8L164.5 88.7L166.2 90.7L167.3 93.1L170.7 93.2L174.0 95.7L175.5 95.6L178.1 97.5L179.5 97.3L180.4 97.9L180.5 97.3L180.6 98.2L182.9 100.1L182.7 100.6L182.1 100.5L182.3 101.0L183.3 103.3L184.4 104.0L184.4 106.8L185.6 107.7L183.8 107.1L182.9 106.1L181.7 106.7L181.3 107.9L181.8 108.2L181.1 108.4L181.8 110.5L184.4 112.1L184.8 116.3L185.4 117.5L184.4 120.6L184.0 128.9L183.1 129.3L181.4 131.7L181.6 131.1L180.8 130.8L179.5 131.8L178.9 136.2L178.3 137.0L178.6 138.0L176.5 138.2L176.3 139.9L175.0 139.3L174.5 139.9L172.6 139.8L171.1 142.6L170.9 146.2L170.3 147.2L171.3 149.7L175.1 151.4L176.2 152.4L179.4 148.5L180.0 148.2L179.9 148.9L180.5 148.7L182.7 144.2L184.2 143.1L184.1 142.5L182.6 142.4L182.5 142.1L184.5 142.0L185.6 140.3L189.9 139.4L190.8 138.1L192.2 137.4L195.5 138.5L197.1 139.8L199.9 146.3L200.3 152.1L201.6 157.0L202.0 163.5L202.8 167.4L204.4 171.3L203.1 174.0L203.2 177.9L201.9 182.7L200.6 184.4L199.3 184.4L198.5 185.4L199.2 184.2L198.2 184.2L199.0 183.2L197.7 183.0L199.1 181.4L199.6 181.6L199.6 180.7L198.1 180.2L195.7 181.4L195.4 182.5L196.5 183.2L196.2 184.0L195.1 184.0L194.2 185.3L194.0 189.0L193.0 190.5L192.2 190.6L192.3 191.0L190.0 191.7L189.2 192.6L188.6 194.2L188.5 198.8L187.2 199.2L187.2 200.2L186.7 200.2L187.3 201.3L187.0 201.0L186.8 201.8L186.2 201.8L185.5 203.7L184.9 203.3L184.3 203.6L183.8 205.3L182.9 205.6L181.7 207.4L181.9 209.6L181.6 209.1L180.8 209.1L181.3 209.9L151.4 211.0L151.4 209.0ZM88.4 33.4L89.0 33.1L89.8 33.4L89.5 33.7ZM52.7 19.4L53.7 18.9L53.1 18.8L54.6 17.3L63.2 13.4L66.7 10.7L71.3 9.4L71.4 10.0L68.1 12.4L67.8 13.5L65.8 15.0L60.8 16.8L58.4 18.2L58.5 18.7L60.8 18.3L60.5 18.7L54.9 20.8L53.3 19.9L54.0 18.8ZM27.1 59.8L29.0 58.5L35.8 56.5L41.1 52.0L49.1 51.3L53.5 49.1L55.7 46.6L59.1 46.3L61.0 43.2L65.8 39.6L67.9 38.8L71.3 34.9L75.8 32.4L81.2 31.5L85.1 31.7L86.9 32.6L87.0 33.9L81.6 34.3L81.9 35.9L79.3 37.2L77.0 39.7L75.6 40.2L75.5 41.8L74.5 42.0L74.1 43.3L72.9 44.0L72.5 45.8L70.8 47.3L70.0 51.6L70.4 53.0L69.7 54.0L70.7 53.7L72.2 51.4L71.7 51.1L72.0 50.5L72.9 50.8L75.3 48.5L77.5 47.4L77.4 48.1L75.5 49.6L74.4 51.9L75.9 49.7L78.9 48.8L84.7 49.7L85.7 50.6L86.4 50.5L86.7 51.8L87.7 51.2L88.0 52.0L89.7 53.1L89.9 54.7L90.9 55.8L91.3 55.9L91.7 57.3L92.6 57.7L93.2 59.0L94.5 59.1L94.1 60.9L94.9 61.8L97.1 62.2L99.1 61.7L100.2 62.0L102.7 60.8L103.6 61.4L104.0 62.7L105.0 62.9L105.6 63.8L106.9 63.8L107.5 62.5L108.4 62.5L109.4 63.8L110.5 63.7L110.7 64.6L114.6 60.3L117.2 59.5L121.4 56.6L123.0 57.1L127.7 56.0L136.0 56.4L141.4 54.0L148.1 53.4L146.4 56.1L146.5 60.4L145.9 61.1L146.8 62.5L148.5 62.2L148.8 62.8L150.2 62.8L151.2 63.6L154.2 62.3L155.3 62.4L156.6 64.1L155.9 63.8L156.3 64.6L158.2 63.5L158.8 63.9L159.9 61.8L163.1 62.1L164.2 60.8L166.4 60.9L166.8 61.8L166.0 64.4L167.1 69.4L165.9 70.7L165.4 69.8L165.1 70.1L164.6 69.7L163.2 71.1L164.4 72.3L165.3 71.6L166.5 71.8L167.1 72.8L168.6 73.2L167.7 74.5L169.7 76.8L170.6 76.5L171.6 77.8L171.2 78.8L169.7 78.4L169.4 79.1L166.7 77.9L165.3 78.0L165.5 78.5L163.3 77.7L163.5 78.7L161.4 78.7L161.4 79.3L160.6 79.0L160.8 79.5L159.6 78.6L160.1 78.0L159.8 77.6L160.6 77.9L159.9 77.3L159.0 77.2L159.0 78.4L158.1 77.5L157.5 78.4L157.2 76.7L155.8 76.6L154.7 75.8L154.0 76.5L154.1 78.2L153.2 78.4L152.9 79.2L153.4 80.0L152.9 80.1L153.1 81.4L153.7 82.0L152.6 82.4L150.8 81.4L150.7 80.6L149.0 79.7L146.8 77.1L139.7 74.5L138.7 75.1L138.0 74.3L137.2 74.8L135.9 74.4L132.5 78.5L129.2 78.0L127.3 78.4L126.7 79.0L126.9 79.9L123.4 78.5L120.4 78.6L118.9 79.2L117.8 80.3L117.3 83.7L115.8 83.8L115.3 84.8L113.2 85.3L113.1 86.5L112.1 86.3L112.0 87.8L111.1 88.0L111.4 89.8L109.3 88.3L109.1 87.3L110.0 87.0L110.1 86.1L111.2 85.1L111.0 84.2L112.6 84.5L112.1 83.8L113.3 82.0L113.1 80.9L112.1 80.6L110.6 82.6L109.0 82.4L108.4 81.5L107.6 81.7L107.9 83.7L107.1 84.0L107.5 84.5L106.8 84.5L106.3 86.1L104.1 86.6L103.5 87.7L102.7 82.7L104.0 81.2L103.9 80.5L103.3 80.3L102.3 81.7L102.8 82.1L101.5 83.2L101.4 84.9L102.0 85.4L101.0 86.3L101.4 86.5L98.5 88.6L95.4 94.6L95.6 95.2L93.2 99.3L89.5 103.8L89.3 104.6L89.7 105.5L88.2 105.1L86.5 103.1L87.1 100.4L88.5 97.9L88.3 97.0L87.5 96.3L86.1 97.6L84.0 97.9L83.6 97.1L83.2 97.4L84.0 95.9L83.7 95.0L85.3 92.9L84.4 91.0L85.3 91.0L85.6 90.2L84.6 88.2L85.5 87.2L83.4 85.0L81.5 84.9L80.9 83.8L79.1 84.2L77.8 83.3L79.1 81.4L78.4 81.0L78.4 79.8L76.4 78.9L75.4 79.0L75.2 78.5L73.4 78.8L72.3 77.7L71.4 78.2L70.5 77.4L69.8 77.6L69.3 76.8L67.6 77.2L67.4 76.9L67.0 77.8L65.8 77.8L65.6 77.0L64.3 76.6L63.4 76.9L63.0 76.4L62.6 76.8L56.5 73.1L33.7 66.9L31.6 61.8L30.3 61.7L30.3 61.1L29.4 61.3L29.0 60.2L27.7 60.9Z"/></g><g fill="rgba(193,80,46,.14)" stroke="#C1502E" stroke-width="1.0" stroke-linejoin="round"><path data-county="Wayne" d="M179.2 188.1L187.2 187.8L194.3 187.6L194.0 189.0L193.0 190.5L190.0 191.7L189.2 192.7L188.6 194.2L188.5 198.8L187.2 199.2L187.0 200.4L184.9 198.7L179.4 198.9Z"/><path data-county="Oakland" d="M176.1 174.5L189.1 174.0L189.5 187.7L176.7 188.2Z"/><path data-county="Macomb" d="M189.1 174.0L197.2 173.7L197.4 179.7L197.9 180.3L195.5 181.7L195.4 182.5L196.5 183.2L196.1 183.2L196.2 184.0L195.1 184.0L194.3 185.2L194.0 186.8L194.3 187.6L189.5 187.7Z"/></g><rect x="173.1" y="170.7" width="27.8" height="32.8" fill="none" stroke="#A8431F" stroke-width="1" rx="1.5"/><path d="M200.9 170.7L222 34M200.9 203.5L222 186" stroke="#C9BFB1" stroke-width=".8" fill="none"/><rect x="222" y="34" width="130" height="152" rx="10" fill="#FFFCF7" stroke="#D3CABD" stroke-width="1"/><g fill="rgba(193,80,46,.14)" stroke="#C1502E" stroke-width="1.6" stroke-linejoin="round"><path data-county="Wayne" d="M252.5 112.1L287.6 110.8L318.9 110.0L317.3 115.8L317.7 116.2L317.3 116.2L316.9 117.6L316.1 118.9L314.1 120.4L313.2 122.6L309.7 123.1L309.4 123.4L309.9 123.8L310.7 123.9L310.1 125.1L307.3 126.2L304.4 126.4L300.0 128.3L298.4 129.7L296.5 132.3L293.9 139.0L293.1 147.7L294.0 152.8L294.6 154.4L293.4 159.2L292.3 159.2L290.8 159.8L290.5 159.3L289.8 159.4L289.4 159.7L289.6 161.3L288.5 160.2L287.6 161.0L287.5 162.5L288.0 165.0L288.0 165.5L286.8 166.2L285.8 165.6L285.4 165.7L284.8 164.8L283.8 164.9L283.9 164.1L283.6 164.1L283.4 163.5L283.2 163.6L282.5 163.2L282.0 163.3L281.9 162.9L281.4 162.8L281.7 162.3L281.1 161.5L280.2 162.1L279.9 161.2L279.2 161.2L279.4 160.6L279.1 160.7L278.9 160.4L279.2 160.3L278.8 160.2L278.6 159.3L278.3 159.5L278.3 159.2L278.0 159.3L277.5 158.7L265.2 158.8L265.3 159.6L253.7 159.9Z"/><path data-county="Oakland" d="M239.1 52.6L261.9 51.9L262.1 51.3L296.2 50.2L298.1 110.5L241.5 112.7L239.7 76.6Z"/><path data-county="Macomb" d="M296.2 50.2L303.9 50.0L307.2 49.5L331.6 49.0L332.6 75.1L333.5 75.6L333.2 75.9L334.9 77.8L334.6 78.2L332.9 78.3L332.1 79.1L332.0 79.7L331.3 79.6L330.2 80.1L329.6 80.9L329.6 81.9L327.6 82.5L326.4 82.1L326.0 82.2L324.4 84.1L323.7 86.0L323.7 87.5L326.4 89.0L326.6 90.2L328.0 90.2L328.5 90.6L327.0 90.7L326.8 91.7L327.5 93.6L327.4 94.4L327.2 94.6L326.8 93.9L326.0 93.6L323.7 93.6L322.4 94.0L321.3 94.9L320.8 96.5L318.8 99.3L317.7 103.1L317.6 104.3L318.0 104.6L317.6 104.7L317.5 106.5L318.2 107.1L318.3 108.7L319.0 109.5L318.9 110.0L298.1 110.5Z"/></g><g font-family="Khand,sans-serif" font-weight="600" fill="#2A241C"><g class="hb-pin"><path d="M278.7 131.0L275.6 126.1A3.6 3.6 0 1 1 281.8 126.1Z" fill="#C1502E"/><circle cx="278.7" cy="124.7" r="1.4" fill="#FFFCF7"/><text x="278.7" y="144.0" font-size="12" text-anchor="middle" stroke="#FFFCF7" stroke-width="3.6" paint-order="stroke" stroke-linejoin="round">Wayne</text></g><g class="hb-pin"><path d="M268.6 79.4L265.6 74.5A3.6 3.6 0 1 1 271.7 74.5Z" fill="#C1502E"/><circle cx="268.6" cy="73.1" r="1.4" fill="#FFFCF7"/><text x="268.6" y="92.4" font-size="12" text-anchor="middle" stroke="#FFFCF7" stroke-width="3.6" paint-order="stroke" stroke-linejoin="round">Oakland</text></g><g class="hb-pin"><path d="M312.8 74.6L309.7 69.6A3.6 3.6 0 1 1 315.9 69.6Z" fill="#C1502E"/><circle cx="312.8" cy="68.3" r="1.4" fill="#FFFCF7"/><text x="312.8" y="87.6" font-size="12" text-anchor="middle" stroke="#FFFCF7" stroke-width="3.6" paint-order="stroke" stroke-linejoin="round">Macomb</text></g></g></svg>',
  };
  var MAP = MAPS[MAP_CROP] || MAPS.C;
  var INK = "#2A241C", LINE = "#C9BFB1", WALL = "#FDFAF4", ROOF = "#C1502E", ROOF_DK = "#A8431F", GLASS = "#D9E4E8", METAL = "#C9D0D3", APPL = "#D9D4CC", PLANT = "#5E9160";
  var FH = 20, GY = 94, X0 = 118, X1 = 242;
  function win(x, y) { return '<rect x="' + x + '" y="' + y + '" width="12" height="9" rx="1" fill="' + GLASS + '" stroke="' + LINE + '" stroke-width=".8"/><path d="M' + (x + 6) + ' ' + y + 'v9M' + x + ' ' + (y + 4.5) + 'h12" stroke="' + LINE + '" stroke-width=".6"/>'; }
  function floor(n) {
    var top = GY - FH * n, s = '<rect x="' + X0 + '" y="' + top + '" width="' + (X1 - X0) + '" height="' + FH + '" fill="' + WALL + '" stroke="' + LINE + '" stroke-width="1"/>';
    if (n === 1) return s + '<rect x="' + X0 + '" y="' + (GY - 3) + '" width="' + (X1 - X0) + '" height="3" fill="#E9E0D2"/><rect x="196" y="79" width="10" height="15" rx="1.2" fill="#5A5248"/><rect x="203.2" y="86" width="1.3" height="1.3" fill="#E8E0D2"/>' + win(222, 78);
    return s + win(130, top + 5) + win(160, top + 5) + win(192, top + 5) + win(222, top + 5);
  }
  function badge(x, y) { return '<g class="hb-it hb-badge" data-k="__K__" style="display:none"><circle cx="' + x + '" cy="' + y + '" r="4.6" fill="' + ROOF + '"/><text x="' + x + '" y="' + (y + 2.3) + '" font-family="Hind,sans-serif" font-weight="600" font-size="6.4" fill="#fff" text-anchor="middle"></text></g>'; }
  function it(k, inner) { return '<g class="hb-it" data-k="' + k + '" style="display:none">' + inner + '</g>'; }
  function furnace(x) { return '<rect x="' + x + '" y="79" width="12" height="15" rx="1" fill="#D7D0C6" stroke="' + INK + '" stroke-width=".7"/><rect x="' + (x + 2) + '" y="81" width="8" height="4.5" fill="#EEE8DE"/><rect x="' + (x + 3) + '" y="88" width="6" height="1.6" fill="' + LINE + '"/>'; }
  function tank(x) { return '<rect x="' + x + '" y="78" width="9" height="16" rx="3" fill="' + APPL + '" stroke="' + INK + '" stroke-width=".7"/><rect x="' + (x + 2) + '" y="81" width="5" height="2.6" fill="' + LINE + '"/>'; }
  function tankless(x) { return '<rect x="' + x + '" y="80" width="9" height="11" rx="1" fill="' + APPL + '" stroke="' + INK + '" stroke-width=".7"/><path d="M' + (x + 2.5) + ' 83h4M' + (x + 2.5) + ' 85.5h4M' + (x + 2.5) + ' 88h4" stroke="' + INK + '" stroke-width=".6"/>'; }
  function ac(x) { return '<rect x="' + x + '" y="82" width="16" height="12" rx="1" fill="' + METAL + '" stroke="' + INK + '" stroke-width=".7"/><circle cx="' + (x + 8) + '" cy="88" r="3.6" fill="none" stroke="' + INK + '" stroke-width=".8"/><circle cx="' + (x + 8) + '" cy="88" r="1.2" fill="' + INK + '"/>'; }
  function spark(x, y, r) { return '<path d="M' + x + ' ' + (y - r) + 'L' + (x + r * .3) + ' ' + (y - r * .3) + 'L' + (x + r) + ' ' + y + 'L' + (x + r * .3) + ' ' + (y + r * .3) + 'L' + x + ' ' + (y + r) + 'L' + (x - r * .3) + ' ' + (y + r * .3) + 'L' + (x - r) + ' ' + y + 'L' + (x - r * .3) + ' ' + (y - r * .3) + 'Z" fill="#E0A458"/>'; }
  function houseSvg() {
    var roofY = GY - FH; /* roof drawn for 1 story; lifted by translateY for 2 and 3 */
    var roof = '<g class="hb-roof">' +
      it("chimney", '<rect x="205" y="55" width="9" height="13" fill="#B9A89A" stroke="' + INK + '" stroke-width=".6"/><rect x="204" y="54" width="11" height="3" fill="#9C8B7D"/>') +
      '<path d="M' + (X0 - 7) + ' ' + (roofY + 1) + 'L180 ' + (roofY - 19) + 'L' + (X1 + 7) + ' ' + (roofY + 1) + 'Z" fill="' + ROOF + '"/>' +
      '<path d="M' + (X0 - 8) + ' ' + (roofY + 1.5) + 'L180 ' + (roofY - 20.5) + 'L' + (X1 + 8) + ' ' + (roofY + 1.5) + '" fill="none" stroke="' + ROOF_DK + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>' +
      it("gutters", '<path d="M' + (X0 - 8) + ' ' + (roofY + 2.6) + 'h' + (X1 - X0 + 16) + '" stroke="#7E776C" stroke-width="1.8" stroke-linecap="round"/><path d="M' + (X0 - 7) + ' ' + (roofY + 2.6) + 'v5M' + (X1 + 7) + ' ' + (roofY + 2.6) + 'v5" stroke="#7E776C" stroke-width="1.3" stroke-linecap="round"/>') +
      it("lights", '<path d="M' + (X0 - 4) + ' ' + (roofY + 4) + 'Q150 ' + (roofY + 8) + ' 180 ' + (roofY + 4) + 'T' + (X1 + 4) + ' ' + (roofY + 4) + '" fill="none" stroke="' + INK + '" stroke-width=".5" opacity=".6"/>' +
        [124, 138, 152, 166, 180, 194, 208, 222, 236].map(function (x, i) { return '<circle cx="' + x + '" cy="' + (roofY + 5.6 + (i % 2) * 1.2) + '" r="1.5" fill="' + ["#C1502E", "#E0A458", "#05668D"][i % 3] + '"/>'; }).join("")) +
      '</g>';
    return '<svg class="hb-house-svg" viewBox="0 0 360 110" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">' +
      '<rect x="-400" y="-200" width="1160" height="' + (200 + GY) + '" fill="#F8F2E9"/><rect x="-400" y="' + GY + '" width="1160" height="80" fill="#EFE6D8"/><ellipse cx="180" cy="' + (GY + 2) + '" rx="100" ry="4.5" fill="#E6DAC7"/>' +
      it("irrigation", '<g fill="none" stroke="#7A9AA3" stroke-width=".8" stroke-linecap="round"><path d="M10 92q4-9 10-9M14 92q3-6 8-6M28 92q3-8 9-8"/></g><rect x="9" y="92" width="2.4" height="3" fill="#7E776C"/><rect x="27" y="92" width="2.4" height="3" fill="#7E776C"/>') +
      it("testkit", '<rect x="38" y="84" width="8" height="10" rx="1" fill="#E8E2D8" stroke="' + INK + '" stroke-width=".6"/><rect x="39.6" y="86" width="4.8" height="3" fill="#B8C4C0"/>') +
      it("sumpbackup", '<rect x="50" y="84" width="8" height="10" rx="1" fill="#B8C4C0" stroke="' + INK + '" stroke-width=".6"/><rect x="51.6" y="86" width="4.8" height="2.6" fill="#EFE8DC"/><path d="M53 82.6h2" stroke="' + INK + '" stroke-width="1"/>') +
      it("sump", '<ellipse cx="69" cy="93.5" rx="8" ry="2.6" fill="#C5BEB3" stroke="' + INK + '" stroke-width=".6"/><rect x="66" y="85" width="6" height="8" rx="1" fill="#B7B1A6" stroke="' + INK + '" stroke-width=".6"/>') +
      it("flatroof", '<rect x="82" y="78" width="36" height="16" fill="' + WALL + '" stroke="' + LINE + '" stroke-width="1"/><rect x="80" y="75.5" width="40" height="3" rx=".6" fill="#9A8F84"/>' + win(94, 81)) +
      '<g class="hb-fl" data-f="3" style="display:none">' + floor(3) + '</g><g class="hb-fl" data-f="2" style="display:none">' + floor(2) + '</g><g class="hb-fl" data-f="1">' + floor(1) + '</g>' +
      roof +
      it("bathfan", '<rect x="236" y="77" width="4.5" height="4.5" fill="#EEE8DE" stroke="' + INK + '" stroke-width=".5"/><path d="M237 78.5h2.5M237 80h2.5" stroke="' + INK + '" stroke-width=".4"/>') +
      it("windows", spark(236.5, 85, 2.6) + spark(219, 77, 1.8)) +
      it("doorbell", '<rect x="207.6" y="84" width="2" height="3.2" rx=".5" fill="' + INK + '"/><circle cx="208.6" cy="85" r=".5" fill="#E0A458"/>') +
      it("thermostat", '<circle cx="214.5" cy="84" r="2.4" fill="#FFFCF7" stroke="' + INK + '" stroke-width=".6"/><circle cx="214.5" cy="84" r=".8" fill="' + ROOF + '"/>') +
      it("leak", '<path d="M215 88.2c1.3 1.7 2 2.7 2 3.6a2 2 0 0 1-4 0c0-.9.7-1.9 2-3.6z" fill="#05668D"/>') +
      it("bibs", '<rect x="242.5" y="85" width="4.5" height="4.5" rx=".8" fill="#B9B3A8" stroke="' + INK + '" stroke-width=".5"/>') +
      it("f1", furnace(121)) + it("f2", furnace(135)) + badge(146, 79).replace("__K__", "fn") +
      it("w1t", tank(150)) + it("w1k", tankless(150)) + it("w2t", tank(161)) + it("w2k", tankless(161)) + badge(169, 79).replace("__K__", "wn") +
      it("softener", '<rect x="173" y="80" width="8" height="14" rx="3.5" fill="#D5D0C8" stroke="' + INK + '" stroke-width=".7"/><circle cx="177" cy="84.5" r="1.2" fill="' + LINE + '"/>') +
      it("humidifier", '<rect x="184" y="80" width="9" height="10" rx="1" fill="#D3CEC6" stroke="' + INK + '" stroke-width=".6"/><path d="M187 82.5c1.8 1.6 1.8 3.4 0 5" fill="none" stroke="#7A9AA3" stroke-width=".8" stroke-linecap="round"/>') +
      '<g fill="' + PLANT + '"><ellipse cx="115" cy="93" rx="4" ry="2.6"/><ellipse cx="248.5" cy="93.4" rx="3.4" ry="2.2"/></g>' +
      it("a1", ac(252)) + it("a2", ac(270)) + badge(285, 82).replace("__K__", "an") +
      it("generator", '<rect x="290" y="82" width="18" height="12" rx="1" fill="#C5C8C2" stroke="' + INK + '" stroke-width=".7"/><rect x="292" y="85" width="6" height="6" fill="#A8ABA6"/><circle cx="304" cy="88" r="2" fill="' + INK + '" opacity=".35"/>') +
      it("mower", '<rect x="313" y="86" width="13" height="5" rx="1.4" fill="#9FB39A" stroke="' + INK + '" stroke-width=".6"/><path d="M324 86l3.6-6.4" stroke="' + INK + '" stroke-width=".9" stroke-linecap="round"/><circle cx="315.6" cy="92.4" r="1.6" fill="' + INK + '"/><circle cx="323.4" cy="92.4" r="1.6" fill="' + INK + '"/>') +
      it("snowblower", '<rect x="332" y="84" width="12" height="8" rx="1.4" fill="#D9C27A" stroke="' + INK + '" stroke-width=".6"/><path d="M332 86.5h-2.6v5h2.6M342 84l3-5" fill="none" stroke="' + INK + '" stroke-width=".8" stroke-linecap="round"/><circle cx="338" cy="93" r="1.6" fill="' + INK + '"/>') +
      it("generic", '<path d="M351 94V80" stroke="#7E776C" stroke-width="1"/><path d="M351 80h7l-1.8 2.6L358 85h-7z" fill="' + ROOF + '"/>') +
      '</svg>';
  }
  /* Label rules: one shared selection (extras and add-ons) maps to one item on the house. */
  var LABEL_MAP = [[/flat roof/, "flatroof"], [/gutter/, "gutters"], [/chimney/, "chimney"], [/generator/, "generator"], [/irrigation|sprinkler/, "irrigation"],
    [/sump pump battery|battery backup/, "sumpbackup"], [/sump/, "sump"], [/humidifier/, "humidifier"], [/softener/, "softener"], [/window/, "windows"],
    [/christmas|lights/, "lights"], [/leak/, "leak"], [/bath fan/, "bathfan"], [/thermostat/, "thermostat"], [/mower/, "mower"], [/snowblower/, "snowblower"],
    [/hose bib/, "bibs"], [/doorbell/, "doorbell"], [/radon|lead|water test/, "testkit"]];
  function itemsOf(st) {
    var on = {}, n;
    n = Math.max(0, +st.furnaces || 0); if (n > 0) on.f1 = 1; if (n > 1) on.f2 = 1; if (n > 2) on.fn = n;
    n = Math.max(0, +st.acs || 0); if (n > 0) on.a1 = 1; if (n > 1) on.a2 = 1; if (n > 2) on.an = n;
    var wt = st.wh || []; if (wt.length > 0) on[wt[0] === "tankless" ? "w1k" : "w1t"] = 1; if (wt.length > 1) on[wt[1] === "tankless" ? "w2k" : "w2t"] = 1; if (wt.length > 2) on.wn = wt.length;
    (st.labels || []).forEach(function (l) {
      var s = String(l || "").toLowerCase(), k = "generic";
      for (var i = 0; i < LABEL_MAP.length; i++) if (LABEL_MAP[i][0].test(s)) { k = LABEL_MAP[i][1]; break; }
      on[k] = 1;
    });
    return on;
  }
  function cap(st) {
    var n = Math.max(1, Math.min(3, +st.stories || 1));
    var size = String(st.sizeLabel || "").replace(/\bto\b/g, "To").replace(/\bover\b/i, "Over").replace(/\bunder\b/i, "Under");
    return (n === 1 ? "1 Story" : n + " Stories") + (size ? " \u00b7 " + size : "");
  }
  var band = null, last = null, lastScreen = null;
  function el(sel) { return band.querySelector(sel); }
  function build() {
    band = document.createElement("div");
    band.className = "ob-hb";
    band.innerHTML = '<div class="ob-hb-art"><div class="ob-hb-map">' + MAP + '</div><div class="ob-hb-house">' + houseSvg() + '</div></div><p class="ob-hb-cap" aria-live="polite"></p>';
  }
  function reduced() { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { return false; } }
  function anim(node, frames, ms, easing, after, hold) {
    if (node._hbA) { try { node._hbA.cancel(); } catch (e) {} node._hbA = null; }
    if (!node.animate) { if (after) after(); return; }
    var a = node.animate(frames, { duration: ms, easing: easing || "cubic-bezier(.2,.8,.2,1)", fill: hold ? "forwards" : "none" }), done = false;
    node._hbA = a;
    function end() { if (done) return; done = true; if (node._hbA === a) node._hbA = null; if (after) after(); if (hold) { try { a.cancel(); } catch (e) {} } }
    a.onfinish = end;
    a.oncancel = function () { done = true; };
    /* fallback so a hidden layer is always cleared, even if the finish event never arrives */
    if (after) setTimeout(function () { if (!done && node._hbA === a) end(); }, ms + 120);
    return a;
  }
  var EASE_POP = "cubic-bezier(.3,1.4,.5,1)";
  function show(node, on, animate, rm) {
    var vis = node.style.display !== "none";
    if (on === vis && !node._hbHiding) return false;
    if (!on && node._hbHiding) return false;
    if (on) {
      node._hbHiding = false; node.style.display = "";
      if (animate) {
        if (rm) anim(node, [{ opacity: 0 }, { opacity: 1 }], 150, "linear");
        else anim(node, [{ opacity: 0, transform: "scale(.2)" }, { opacity: 1, transform: "scale(1.22)", offset: .62 }, { opacity: 1, transform: "scale(1)" }], 280, EASE_POP);
      } else if (node._hbA) { node._hbA.cancel(); node._hbA = null; }
    } else {
      if (!animate) { node.style.display = "none"; node._hbHiding = false; return true; }
      node._hbHiding = true;
      anim(node, rm ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.4)" }], rm ? 150 : 200, rm ? "linear" : "ease-in",
        function () { if (node._hbHiding) { node.style.display = "none"; node._hbHiding = false; } }, true);
    }
    return true;
  }
  function roofY(n) { return -FH * (n - 1); }
  function applyStories(from, to, animate, rm) {
    var roof = el(".hb-roof");
    [2, 3].forEach(function (f) {
      var fl = el('.hb-fl[data-f="' + f + '"]'), on = f <= to, was = f <= from;
      if (on === was && !fl._hbHiding) { fl.style.display = on ? "" : "none"; return; }
      if (on) {
        fl._hbHiding = false; fl.style.display = "";
        if (animate) anim(fl, rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "translateY(-26px)" }, { opacity: 1, transform: "translateY(-8px)", offset: .55 }, { opacity: 1, transform: "translateY(0)" }], rm ? 150 : 280, rm ? "linear" : "cubic-bezier(.33,0,.2,1)");
      } else if (!animate) { fl.style.display = "none"; }
      else {
        fl._hbHiding = true;
        anim(fl, rm ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-26px)" }], rm ? 150 : 260, rm ? "linear" : "cubic-bezier(.5,0,.75,0)",
          function () { if (fl._hbHiding) { fl.style.display = "none"; fl._hbHiding = false; } }, true);
      }
    });
    roof.style.transform = "translateY(" + roofY(to) + "px)";
    if (animate && from !== to) {
      if (rm) anim(roof, [{ opacity: 0 }, { opacity: 1 }], 150, "linear");
      else if (to > from) anim(roof, [{ transform: "translateY(" + (roofY(to) - 26) + "px)" }, { transform: "translateY(" + (roofY(to) - 8) + "px)", offset: .55 }, { transform: "translateY(" + roofY(to) + "px)" }], 280, "cubic-bezier(.33,0,.2,1)");
      else anim(roof, [{ transform: "translateY(" + roofY(from) + "px)" }, { transform: "translateY(" + (roofY(from) - 6) + "px)", offset: .3 }, { transform: "translateY(" + roofY(to) + "px)" }], 280, "cubic-bezier(.4,0,.2,1)");
    }
  }
  function sync(st) {
    var slot = document.querySelector(".ob .ob-hb-slot");
    if (!st || !slot) { if (band && band.parentNode) band.parentNode.removeChild(band); last = null; lastScreen = st ? st.screen : null; document.documentElement.classList.remove("ob-hb-on", "ob-hb-mini", "ob-hb-t", "ob-hb-noart", "ob-hb-nodyk", "ob-hb-t2", "ob-hb-afx"); document.documentElement.removeAttribute("data-hb-fit"); return; }
    if (!band) build();
    var fresh = !last;
    if (band.parentNode !== slot) slot.appendChild(band);
    document.documentElement.classList.add("ob-hb-on");
    var rm = reduced(), animate = !fresh;
    var mode = st.screen === "address" ? "map" : "house";
    var prevMode = last ? last.mode : null;
    band.setAttribute("data-mode", mode);
    var mapEl = el(".ob-hb-map"), houseEl = el(".ob-hb-house");
    mapEl.setAttribute("aria-hidden", mode === "map" ? "false" : "true");
    if (animate && prevMode && prevMode !== mode) {
      var inEl = mode === "map" ? mapEl : houseEl, outEl = mode === "map" ? houseEl : mapEl;
      anim(inEl, rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "translateY(0)" }], rm ? 150 : 280, rm ? "linear" : "cubic-bezier(.2,.8,.2,1)");
      anim(outEl, [{ opacity: 1 }, { opacity: 0 }], rm ? 150 : 240, "linear");
    }
    var stories = Math.max(1, Math.min(3, +st.stories || 1)), items = itemsOf(st);
    /* items and stories only animate while the house is on screen; switching from the map shows the current house as is */
    var live = animate && prevMode === "house" && mode === "house";
    applyStories(last ? last.stories : stories, stories, live, rm);
    band.querySelectorAll(".hb-it").forEach(function (g) {
      var k = g.getAttribute("data-k"), on = !!items[k], changed;
      if (g.classList.contains("hb-badge")) { var t = g.querySelector("text"), v = on ? String(items[k]) : ""; changed = t.textContent !== v && on && g.style.display !== "none"; if (on) t.textContent = v; show(g, on, live, rm); if (changed && live) anim(g, rm ? [{ opacity: .3 }, { opacity: 1 }] : [{ transform: "scale(1)" }, { transform: "scale(1.3)", offset: .5 }, { transform: "scale(1)" }], rm ? 150 : 240, rm ? "linear" : EASE_POP); return; }
      show(g, on, live, rm);
    });
    el(".ob-hb-cap").textContent = mode === "map" ? "Wayne, Oakland And Macomb" : cap(st);
    /* Finish Reveal (deck pick B): the finished house fades and eases in once, when the last step of the sequence opens (st.last from app.js obSeq()). */
    var fin = st.last || "accept";
    if (mode === "house" && st.screen === fin && lastScreen !== fin) {
      anim(houseEl, rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "translateY(10px) scale(.97)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], rm ? 150 : 300, rm ? "linear" : "cubic-bezier(.2,.8,.2,1)");
    }
    last = { mode: mode, stories: stories };
    lastScreen = st.screen;
    kb();
    fit();
  }
  /* One screen with the band, in Machan's cut order: tighter question and answer sizing, then the step icon, then Did You Know.
     The house band is never shrunk. Measured with the full band (240px map on step 1, 120px house on later steps; the keyboard mini strip is ignored) and 8px of air above the Back/Next bar.
     Runs from sync() (before app.js binds the step) and again after bind, on font load and on resize. Reads layout only, no state. */
  /* Tried in order; the first that fits wins. The icon goes before Did You Know, but comes back if Did You Know has to drop anyway and there's room. */
  /* ob-hb-afx (hide the collapsed after-Founding line) is the very last resort. ob-hb-t2 is a last, deeper tightening for the few carts that still don't fit with every other cut (big homes on Plan, the heaviest Review). */
  var LV = ["ob-hb-t", "ob-hb-noart", "ob-hb-nodyk", "ob-hb-t2", "ob-hb-afx"], TRY = [[], ["ob-hb-t"], ["ob-hb-t", "ob-hb-noart"], ["ob-hb-t", "ob-hb-nodyk"], ["ob-hb-t", "ob-hb-noart", "ob-hb-nodyk"],
    ["ob-hb-t", "ob-hb-nodyk", "ob-hb-t2"], ["ob-hb-t", "ob-hb-noart", "ob-hb-nodyk", "ob-hb-t2"], ["ob-hb-t", "ob-hb-noart", "ob-hb-nodyk", "ob-hb-t2", "ob-hb-afx"]];
  function setLv(on) { LV.forEach(function (c) { document.documentElement.classList.toggle(c, on.indexOf(c) >= 0); }); }
  var LEAF = /^(BUTTON|INPUT|SELECT|TEXTAREA|P|H1|H2|H3|LABEL|LI|IMG|svg)$/;
  function vis(c) { return !!c && c !== "transparent" && !/rgba\([^)]*,\s*0\)$/.test(c); }
  function painted(cs) {
    if (vis(cs.backgroundColor) || (cs.backgroundImage && cs.backgroundImage !== "none") || (cs.boxShadow && cs.boxShadow !== "none")) return true;
    return ["Top", "Right", "Bottom", "Left"].some(function (k) { return parseFloat(cs["border" + k + "Width"]) > 0 && cs["border" + k + "Style"] !== "none" && vis(cs["border" + k + "Color"]); });
  }
  function contentBottom(sec, bar) {
    var max = 0, clips = [];
    var all = sec.querySelectorAll("*");
    for (var i = 0; i < all.length; i++) {
      var e = all[i];
      if (e.ownerSVGElement || (bar && bar.contains(e)) || (band && band.contains(e)) || e.classList.contains("ob-hb-slot")) continue;
      var cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) continue;
      var r = e.getBoundingClientRect();
      if (r.height < 1 || r.width < 1) continue;
      if ((cs.overflowY === "auto" || cs.overflowY === "scroll" || cs.overflowY === "hidden") && e.scrollHeight > e.clientHeight + 1) clips.push([e, r.bottom]);
      if (e.children.length && !LEAF.test(e.tagName) && !painted(cs)) continue; /* painted cards and boxes count by their own edge */
      var b = r.bottom;
      for (var j = 0; j < clips.length; j++) if (clips[j][0].contains(e)) b = Math.min(b, clips[j][1]);
      if (b > max) max = b;
    }
    return max;
  }
  function fitsNow(sec) {
    var bar = sec.querySelector(".ob-bar"), ih = window.innerHeight, se = document.scrollingElement || document.documentElement;
    var ok = true; if (window.suHouseRefit) { try { ok = window.suHouseRefit() !== false; } catch (x) {} }
    if (!ok || se.scrollHeight - ih > 0) return false;
    var bt = bar ? Math.min(ih, bar.getBoundingClientRect().top) : ih;
    return bt - contentBottom(sec, bar) >= 8;
  }
  function fit() {
    var html = document.documentElement, sec = document.querySelector("section.ob");
    if (!sec || !band || !band.parentNode || !html.classList.contains("ob-hb-on")) { LV.forEach(function (c) { html.classList.remove(c); }); return 0; }
    document.body.classList.add("on-ob", "on-qf"); /* app.js bind() sets these for every onboarding step; set them a beat early so the pre-bind check matches */
    var mini = html.classList.contains("ob-hb-mini"), n;
    if (mini) html.classList.remove("ob-hb-mini");
    for (n = 0; n < TRY.length; n++) {
      setLv(TRY[n]);
      if (fitsNow(sec)) break;
    }
    if (n >= TRY.length) n = TRY.length - 1;
    if (mini) html.classList.add("ob-hb-mini");
    html.setAttribute("data-hb-fit", TRY[n].join("+") || "none");
    return n;
  }
  var fitT = 0;
  function fitLater() { clearTimeout(fitT); fitT = setTimeout(function () { if (document.documentElement.classList.contains("ob-hb-mini")) return; fit(); }, 150); }
  /* Keyboard: same visualViewport reading as the Back/Next bar lift in app.js (hidden strip under the keyboard >= 80px). */
  var vv = window.visualViewport, queued = false;
  function kb() {
    queued = false;
    var on = false;
    if (vv && band && band.parentNode) on = Math.round(window.innerHeight - (vv.height + vv.offsetTop)) >= 80;
    document.documentElement.classList.toggle("ob-hb-mini", on);
  }
  function queue() { if (!queued) { queued = true; (window.requestAnimationFrame || setTimeout)(kb); } }
  if (vv) { vv.addEventListener("resize", queue); vv.addEventListener("scroll", queue); }
  window.addEventListener("resize", queue);
  window.addEventListener("resize", fitLater);
  try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(); }); } catch (x) {}
  window.suHouse = { sync: sync, itemsOf: itemsOf, fit: fit };
  if (window.suHouseState) sync(window.suHouseState());
})();
