// Trading Environment heat map settings. Edit categories and themes here; environment.html reads window.ENV_CONFIG.
window.ENV_CONFIG = {
    // Event categories, checked in order against "Event Details": the first entry whose match patterns
    // all hit sets the category, so put specific categories above general ones. An entry with no match
    // catches everything left and must stay last. Entries with a source are fed by that file instead.
    //   weight     peak heat, 0 (none) to 1 (hottest)
    //   fadeLeft   days the heat takes to build from nothing before the event
    //   fadeRight  days the heat takes to fade to nothing after the event
    // Heat is full across the event's own days, then fades in a straight line over fadeLeft / fadeRight.
    categories: [
        {
            // FDA decisions, PDUFA dates, BLA/sBLA filings
            id: 'fdaEvent',
            label: 'FDA event',
            weight: 1.0,
            fadeLeft: 15,
            fadeRight: 15,
            match: [/\bFDA\b|PDUFA|\bs?BLA\b/i]
        },
        {
            // quarterly results and revenue
            id: 'earnings',
            label: 'Earnings',
            weight: 0.9,
            fadeLeft: 0,
            fadeRight: 5,
            match: [/financial results|earnings|net revenue|\bQ[1-4]\b.*revenue/i]
        },
        {
            id: 'conferencePresentation',
            label: 'Conference presentation',
            weight: 0.6,
            fadeLeft: 3,
            fadeRight: 3,
            match: [/CONFERENCE/, /present|data|poster|oral|abstract|fireside|chat|QUILT/i]
        },
        {
            id: 'conferenceAttending',
            label: 'Conference (attending)',
            weight: 0.4,
            fadeLeft: 3,
            fadeRight: 3,
            match: [/CONFERENCE/]
        },
        {
            // Must stay above trialDate, whose keywords (QUILT, trial ...) would also match.
            id: 'databaseLock',
            label: 'Database lock',
            weight: 0.9,
            fadeLeft: 0,
            fadeRight: 15,
            match: [/database lock/i]
        },
        {
            id: 'trialDate',
            label: 'Trial completion date',
            weight: 0.9,
            fadeLeft: 15,
            fadeRight: 30,
            match: [/QUILT|topline|enrollment|trial|study|phase|readout|interim/i]
        },
        {
            // Rows from data/ibrx.csv: one per trial whose "Primary completion" date falls near the window.
            // source: 'trials' means it is not keyword-matched against events.csv.
            id: 'trialCompletion',
            label: 'Trial primary completion',
            source: 'trials',
            weight: 0.7,
            fadeLeft: 15,
            fadeRight: 15
        },
        {
            // EC, Saudi, UAE, China ...
            id: 'exUsApproval',
            label: 'Ex-US approval',
            weight: 1.0,
            fadeLeft: 10,
            fadeRight: 10,
            match: [/approv|authoriz/i]
        },
        {
            id: 'financing',
            label: 'Financing',
            weight: 0.7,
            fadeLeft: 0,
            fadeRight: 5,
            match: [/raised|warrant|offering|financing/i]
        },
        {
            id: 'partnership',
            label: 'Partnership',
            weight: 0.6,
            fadeLeft: 5,
            fadeRight: 3,
            match: [/agreement|partner|alliance|collaborat/i]
        },
        {
            id: 'publication',
            label: 'Publication',
            weight: 0.4,
            fadeLeft: 0,
            fadeRight: 5,
            match: [/journal|published|guideline|NCCN/i]
        },
        {
            id: 'media',
            label: 'Media',
            weight: 0.2,
            fadeLeft: 3,
            fadeRight: 3,
            match: [/speaks|show|interview|named|influential/i]
        },
        {
            id: 'other',
            label: 'Other',
            weight: 0.4,
            fadeLeft: 5,
            fadeRight: 5
        }
    ],
    // Stands in for the CONFERENCE placeholder in the match patterns above.
    conferencePattern: /conference|congress|meeting|symposium|summit|\bESMO\b|\bASCO\b|\bSITC\b|\bASH\b|\bSNO\b|\bAUA\b|IASLC|WCLC|MaTOS|THORACS/i,

    // Dates marked like this are uncertain; the tooltip says so. Month-only dates ("Nov 2026") peak on the 15th.
    estimatedPattern: /estimated|expected/i,

    // Colour themes for the matrix. ramp runs from quiet (first) to hot (last); vars set the card's colours.
    defaultTheme: 'magma',
    themes: {
        magma: {
            label: 'Magma',
            ramp: ['#000004', '#3b0f70', '#8c2981', '#de4968', '#fe9f6d', '#fcfdbf'],
            vars: {
                '--card-bg': 'radial-gradient(130% 120% at 70% 0%, #0f2f66 0%, #081a3a 50%, #050f24 100%)',
                '--card-border': 'transparent',
                '--card-shadow': '0 10px 30px rgba(5, 15, 36, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                '--fg': '#c7d4ea',
                '--fg-strong': '#ffffff',
                '--muted': '#93a6c6',
                '--accent': '#5eead4',
                '--accent-rgb': '94, 234, 212',
                '--btn-bg': 'rgba(255, 255, 255, 0.04)',
                '--btn-border': 'rgba(199, 212, 234, 0.25)',
                '--tick-line': 'rgba(147, 166, 198, 0.6)',
                '--gap': 'transparent',
                '--glow-rgb': '254, 159, 109',
                '--hot-glow-rgb': '252, 253, 191',
                '--hot-brightness': '1.3',
                '--focus-ring': 'rgba(255, 255, 255, 0.9)',
                '--tip-bg': 'rgba(5, 15, 36, 0.92)',
                '--tip-fg': '#e2e8f0'
            }
        },
        red: {
            label: 'Red',
            ramp: ['#ffffff', '#fde4e1', '#f9b4ab', '#f0766a', '#dc2f2f', '#b91c1c'],
            vars: {
                '--card-bg': 'radial-gradient(130% 120% at 70% 0%, #0f2f66 0%, #081a3a 50%, #050f24 100%)',
                '--card-border': 'transparent',
                '--card-shadow': '0 10px 30px rgba(5, 15, 36, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                '--fg': '#c7d4ea',
                '--fg-strong': '#ffffff',
                '--muted': '#93a6c6',
                '--accent': '#f87171',
                '--accent-rgb': '248, 113, 113',
                '--btn-bg': 'rgba(255, 255, 255, 0.04)',
                '--btn-border': 'rgba(199, 212, 234, 0.25)',
                '--tick-line': 'rgba(147, 166, 198, 0.6)',
                '--gap': 'transparent',
                '--glow-rgb': '220, 38, 38',
                '--hot-glow-rgb': '248, 113, 113',
                '--hot-brightness': '1.12',
                '--focus-ring': 'rgba(255, 255, 255, 0.9)',
                '--tip-bg': 'rgba(5, 15, 36, 0.92)',
                '--tip-fg': '#e2e8f0'
            }
        }
    },

    // Market intensity chart: one line per entry. Rows from these files are merged by their date column.
    intensityFiles: ['data/ibrx_daily.csv', 'data/ibrx_options_totals.csv'],
    //   column  the CSV column to plot
    //   axis    lines on the same axis share a y scale. 'price' is labelled left of the plot, 'contracts'
    //           left of that, 'shares' inside the plot's right edge; any other axis gets its own
    //           scale with no labels (read its value at the line's end or in the legend)
    //   format  'price' ($8.74), 'shares' (7.11M) or 'contracts' (5,254)
    intensitySeries: [
        { column: 'close', label: 'Close', axis: 'price', format: 'price', color: '#e2e8f0', width: 2 },
        { column: 'volume', label: 'Volume', axis: 'shares', format: 'shares', color: '#60a5fa', width: 1.5 },
        // FINRA-reported short volume, which covers only part of total volume.
        { column: 'short_volume', label: 'Short volume', axis: 'shares', format: 'shares', color: '#fbbf24', width: 1.5 },
        { column: 'call_volume', label: 'Call volume', axis: 'contracts', format: 'contracts', color: '#34d399', width: 1.5 },
        { column: 'put_volume', label: 'Put volume', axis: 'contracts', format: 'contracts', color: '#f472b6', width: 1.5 },
        // Open interest runs ~100x option volume, so it gets its own scale.
        { column: 'total_oi', label: 'Total OI', axis: 'openInterest', format: 'contracts', color: '#a78bfa', width: 1.5 }
    ],

    // Width of one day column in the matrix and the chart, in px (plus a 1px gap). Was 5.
    cellWidth: 11,

    // Rows whose heat never reaches this inside the window are left out.
    minRowHeat: 0.05,
    // Cells at or above this heat pulse.
    hotHeat: 0.82
};
