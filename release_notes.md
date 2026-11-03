# Release notes

## 11-03

- Added Related Companies cards for NantWorks, Nant Capital, NANT Global Finance, and PDSB; speculative IBRX tokenization is explicitly labeled.

## 11-02

- Added Subsidiaries page and navigation with D3 ownership network and collapsible legal tree; assumed parent links are labeled unverified.

## 10-31

- Added Account Performance page with charts, tiles, weekly table, animated site header, and left-navigation link.
- Arranged charts left and analysis cards right; cards stack below 1000px, and typography matches the site.
- Performance charts omit latest two weeks; illustrative position-size line and notes clearly mark the gap and estimate.
- Weekly chart and table also stop two weeks before latest Friday; tiles and header retain current dates.
- Environment chart toggles and category/series settings save in browser; default weights, fades, colors, and series styles live in docs/js/environment-config.js.

## 10-29

- Added Trial Data page with a searchable, sortable table and ClinicalTrials.gov links; added it to left navigation.
- Updated left-navigation labels and Trial Timeline header; removed the 90-day fit control and unified button styling.
- Added Trading Environment heatmap with Friday columns and highlighted monthly OPEX dates.
- Centralized heatmap categories, keyword matching, directional fades, color themes, and intensity-series styling in docs/js/environment-config.js.
- Events peak on exact dates and fade by category; month-only dates peak midmonth.
- Added database-lock and trial-completion categories; trial tooltips show NCT ID, drug, and sponsor.
- Timeline settings dock under navigation; the menu opens on load and beside charts on wide screens.
- Timeline group labels rotate vertically; daily gridlines and date labels appear at close zoom.
- Offscreen FDA/event markers and labels hide, while multi-day event bars remain pinned.
- Matrix uses 12px/day columns, starts two weeks before today, and scrolls both charts together on narrow screens.
- Pixel-aligned cell placement keeps grid lines crisp across display scaling; glow-only pulses avoid blurred gaps.
- Replaced Replay with OPEX Center, which recenters overlapping catalyst peaks without altering shaded dates.
- Hovering a catalyst highlights its row, dims others, and shows category, date, and peak heat.
- Added synchronized market-intensity chart with price, share volume, short volume, call/put volume, and open interest.
- Price, share-volume, option-contract, and open-interest series use separate scales; latest values and names label line ends.
- Daily gridlines align intensity-chart dates with heatmap columns; removed redundant explanatory copy.
