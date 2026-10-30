# Release notes

## 10-29

- Added a "Trial data" page (`docs/trials.html`): a DataTables table of every trial in `data/ibrx.csv`, with sortable columns, search, and links to each trial on clinicaltrials.gov.
- Added a "Trial data" item to the left menu (`docs/js/sidenav.js`).
- Renamed left menu items: "Trading Timeline" → "Trial timeline", "Partner Drug/Pharma" → "Drug combos/collab".
- Restored the timeline page header to match the other pages: large white "Trial Timeline" title with kicker and subtitle stacked on the left.
- Removed the "Fit 90 day trade window" button and its item filter from the timeline page.
- Restyled the timeline buttons to one shared look: white rounded pills with navy text that fill navy on hover.
- Added a "Trading Environment" page (`docs/environment.html`) and left menu item: a heat map with one row per event in `data/events.csv` and one column per day for the next 60 days. Date marks fall on Fridays (weekly options expiry), with monthly expiry highlighted.
- Heat map category weights and keyword rules live in `docs/js/environment-config.js`. Estimated events spread full heat 5 days each side; trial events peak on their date and fade over 2 weeks.
- Heat map colour themes: the original look is saved as "Magma", and a new "Red" theme runs from white (quiet) to red (hot) on the same navy card. Swatches in the matrix toolbar switch themes, and the browser remembers the choice. Themes are defined in `docs/js/environment-config.js`.
- Heat map config is now one ordered `categories` array: each category sets its own weight, keyword match, and `fadeLeft` / `fadeRight` days (e.g. earnings fade 5 days each way). Every category fades in a straight line.
- Estimated events no longer get a ±5-day block of full heat: they peak on their date and fade by their category's `fadeLeft` / `fadeRight`, like exact dates. Month-only dates peak on the 15th.
- Database locks have their own `databaseLock` category in the heat map config, separate from other trial dates.
- The heat map adds a row for each trial in `data/ibrx.csv` whose primary completion date falls near the 60-day window. These rows use a new `trialCompletion` config entry (`source: 'trials'`), and their tooltip shows the NCT number, drug and sponsor.
- Timeline settings moved from the gear dialog into the left menu, stacked under "Trial timeline". On the timeline page the menu opens on load and docks beside the timeline (wide screens) instead of covering it; the hamburger still closes it. Other pages are unchanged.
- Timeline group names (FDA, Trial, Events) in the left column now read vertically.
- FDA and event dots no longer pin to the left edge when scrolled past: once a dot leaves the screen, the event and its label hide. Month-long event bars still pin as before.
- Day gridlines appear on the timeline once you zoom to about 3 months or less, and the time axis numbers every day with the month and year beneath.
- Trading Environment matrix now starts two weeks before today (75 day columns), sits left-aligned 16px from the menu, and draws the monthly OPEX lines 3px wide.
- Matrix grid lines are all one screen pixel at any display scaling (100% to 200%). Cell, gap and row sizes are set in screen pixels for the current `devicePixelRatio`, each cell is placed from its column number so rounding cannot drift across the row, and the load-in animation is dropped once it has played. The hot-cell pulse animates only its glow (a white inset stands in for the old brightness filter); the filter put cells on GPU layers that blurred the gaps.
- Replaced the matrix "Replay" button with "Opex center" (it reads "Date center" while active, to switch back): every event whose shading overlaps a monthly OPEX gets its darkest shade moved onto that OPEX, fading out to the same first and last shaded days set by its category in `js/environment-config.js`. The shaded cells stay the same.
- Hovering a catalyst's name in the matrix highlights its row: the other cells dim, the row is outlined, and a tooltip shows the full name, category, date and peak heat.
- Matrix card renamed "Event catalyst matrix". Added a "Market intensity catalysts" card below it, the same size, for line graphs (data to come). It shares the matrix's day axis, Friday date marks and monthly OPEX lines, so each day lines up in both cards; for now it shows an empty plot with "Data coming soon".
- Market intensity chart now plots IBRX close, volume and short volume from `data/ibrx_daily.csv`, one point per trading day on the matrix's day columns. Close uses a dollar scale on the left; volume and short volume share a shares scale on the right (FINRA short volume covers only part of total volume, about 30% here). The left column reads out each line's value for the latest day, or the hovered day, with a guide line and dots on the plot. Lines, colours and axes are set in `intensitySeries` in `js/environment-config.js`.
- Doubled the day columns on the Trading Environment page: matrix cells are 11px instead of 5px (12px per day with the gap), so both cards grow from 760px to 1210px wide. The width is `cellWidth` in `js/environment-config.js`. On windows narrower than the cards, the section scrolls sideways, both cards together.
- Market intensity chart: each line's latest value is labelled at its end in the line's colour (e.g. $8.74), with labels nudged apart when they would overlap.
- Market intensity chart: faint vertical gridlines, one per day, sit in the gaps between the matrix's columns so each day reads as the same column in both cards.
- Trading Environment page: removed the explanatory line above the matrix ("18 events shape…") and the note below the cards. The line above still shows "Loading events…" and any load error, and hides once the data loads.
- Market intensity chart: added call volume, put volume and total open interest from the new `data/ibrx_options_totals.csv`, merged by date with `data/ibrx_daily.csv` (files listed in `intensityFiles` in `js/environment-config.js`). Call and put volume share a contracts scale, labelled in a second column left of the price axis; total OI (~100x option volume) has its own unlabelled scale, read from its end label and the legend. Only Oct 29 has options data so far, so each shows as a single point.
