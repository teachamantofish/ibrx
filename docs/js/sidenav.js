// Left menu shared by the timeline pages: icons only, labels when the hamburger opens it.
(function () {
    const PAGES = [
        {
            href: 'index.html',
            label: 'Trial timeline',
            // Gantt bars
            icon: '<path d="M4 6h9M7 12h11M5 18h7"/><path d="M3 3v18" opacity=".45"/>'
        },
        {
            href: 'cotreatment.html',
            label: 'Drug combos/collab',
            // Molecule: three bonded atoms
            icon: '<circle cx="7" cy="7" r="2.6"/><circle cx="17" cy="9" r="2.6"/><circle cx="10" cy="17.5" r="2.6"/>' +
                '<path d="M9.5 7.6l5 .9M8 9.4l1.3 5.6M15.2 11l-3.4 4.6"/>'
        },
        {
            href: 'trials.html',
            label: 'Trial data',
            // Table grid
            icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M3 14.5h18M9 9v11"/>'
        }
    ];

    function svg(body) {
        return '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" ' +
            'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + body + '</svg>';
    }

    function build() {
        const current = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
        const nav = document.createElement('nav');
        nav.id = 'sidenav';
        nav.setAttribute('aria-label', 'Pages');
        nav.innerHTML =
            '<button type="button" class="sidenav-toggle" aria-expanded="false" aria-label="Open menu" title="Menu">' +
            svg('<path d="M4 7h16M4 12h16M4 17h16"/>') + '</button>' +
            '<ul>' + PAGES.map(function (page) {
                const active = page.href === current ? ' class="active" aria-current="page"' : '';
                return '<li><a href="' + page.href + '"' + active + ' title="' + page.label + '">' +
                    svg(page.icon) + '<span>' + page.label + '</span></a></li>';
            }).join('') + '</ul>';

        const backdrop = document.createElement('div');
        backdrop.className = 'sidenav-backdrop';

        document.body.prepend(backdrop);
        document.body.prepend(nav);
        document.body.classList.add('has-sidenav');

        const toggle = nav.querySelector('.sidenav-toggle');
        function setOpen(open) {
            nav.classList.toggle('open', open);
            backdrop.classList.toggle('open', open);
            toggle.setAttribute('aria-expanded', String(open));
            toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        }

        toggle.addEventListener('click', function () {
            setOpen(!nav.classList.contains('open'));
        });
        backdrop.addEventListener('click', function () {
            setOpen(false);
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') setOpen(false);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', build);
    } else {
        build();
    }
})();
