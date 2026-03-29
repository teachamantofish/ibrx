(function () {
    'use strict';

    var REVENUE_POINTS = [
        { x: '2024-03-31', y: 0.04 },
        { x: '2024-06-30', y: 1.0 },
        { x: '2024-09-30', y: 2.5 },
        { x: '2024-12-31', y: 7.6 },
        { x: '2025-03-31', y: 16.5 },
        { x: '2025-06-30', y: 26.4 },
        { x: '2025-09-30', y: 32.1 },
        { x: '2025-12-31', y: 38.3 }
    ];

    var Y_MIN = 0;
    var Y_MAX = 100;

    function getNormalizedPoints() {
        return REVENUE_POINTS.map(function (point) {
            return {
                x: new Date(point.x + 'T00:00:00'),
                y: Number(point.y)
            };
        });
    }

    function createOverlayContainer(host) {
        var container = document.createElement('div');
        container.id = 'revenueGraphOverlay';
        container.style.position = 'absolute';
        container.style.left = '0px';
        container.style.top = '0px';
        container.style.width = '0px';
        container.style.height = '0px';
        container.style.zIndex = '50';
        container.style.pointerEvents = 'none';
        container.style.display = 'none';
        container.style.background = 'transparent';

        // Force a positioned parent so absolute overlay coordinates are stable.
        host.style.position = 'relative';

        host.appendChild(container);
        return container;
    }

    function injectOverlayStyles() {
        if (document.getElementById('revenueOverlayStyles')) {
            return;
        }

        var style = document.createElement('style');
        style.id = 'revenueOverlayStyles';
        style.textContent = [
            '#revenueGraphOverlay svg { width: 100%; height: 100%; overflow: visible; }',
            '#revenueGraphOverlay .revenue-line { fill: none; stroke: #15803d; stroke-width: 3; stroke-linejoin: round; stroke-linecap: round; }',
            '#revenueGraphOverlay .revenue-point { fill: #15803d; }',
            '#revenueGraphOverlay .revenue-label-rect { fill: #86efac; opacity: 0.95; }',
            '#revenueGraphOverlay .revenue-label-text { fill: #14532d; font: 12px/1 Arial, sans-serif; font-weight: 700; }'
        ].join('\n');

        document.head.appendChild(style);
    }

    function createSvgLayer(container) {
        var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('class', 'revenue-line');
        svg.appendChild(path);
        container.appendChild(svg);

        return {
            svg: svg,
            path: path,
            pointNodes: [],
            labelNodes: []
        };
    }

    function formatRevenueLabel(value) {
        if (value >= 10) {
            return '$' + value.toFixed(1) + 'M';
        }
        if (value >= 1) {
            return '$' + value.toFixed(1) + 'M';
        }
        return '$' + value.toFixed(2) + 'M';
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function RevenueOverlay(timeline, host) {
        this.timeline = timeline;
        this.host = host;
        this.points = getNormalizedPoints();
        injectOverlayStyles();
        this.container = createOverlayContainer(host);
        this.layer = createSvgLayer(this.container);
        this.visible = false;

        this.updateBounds = this.updateBounds.bind(this);
        this.render = this.render.bind(this);
        this.timeline.on('changed', this.updateBounds);
        this.timeline.on('rangechanged', this.render);
        this.timeline.on('changed', this.render);

        this.updateBounds();
    }

    RevenueOverlay.prototype.updateBounds = function () {
        var center = this.host.querySelector('.vis-timeline .vis-panel.vis-center');
        if (!center) {
            return;
        }

        var hostRect = this.host.getBoundingClientRect();
        var centerRect = center.getBoundingClientRect();

        this.container.style.left = (centerRect.left - hostRect.left) + 'px';
        this.container.style.top = (centerRect.top - hostRect.top) + 'px';
        this.container.style.width = centerRect.width + 'px';
        this.container.style.height = centerRect.height + 'px';
    };

    RevenueOverlay.prototype.render = function () {
        if (!this.visible) {
            return;
        }

        this.updateBounds();
        var windowRange = this.timeline.getWindow();
        var startMs = windowRange.start.getTime();
        var endMs = windowRange.end.getTime();
        var spanMs = endMs - startMs;
        if (spanMs <= 0) {
            return;
        }

        var width = this.container.clientWidth;
        var height = this.container.clientHeight;
        if (width <= 0 || height <= 0) {
            return;
        }

        var inWindow = this.points.filter(function (point) {
            var t = point.x.getTime();
            return t >= startMs && t <= endMs;
        });

        // If no revenue month is visible, hide the overlay entirely.
        if (!inWindow.length) {
            this.layer.path.setAttribute('d', '');
            this.layer.pointNodes.forEach(function (node) {
                node.remove();
            });
            this.layer.pointNodes = [];
            this.layer.labelNodes.forEach(function (node) {
                node.group.remove();
            });
            this.layer.labelNodes = [];
            this.container.style.visibility = 'hidden';
            return;
        }

        this.container.style.visibility = 'visible';

        var plotPoints = inWindow.map(function (point) {
            var t = point.x.getTime();
            var xRatio = (t - startMs) / spanMs;
            var x = clamp(xRatio, 0, 1) * width;

            var yRatio = (point.y - Y_MIN) / (Y_MAX - Y_MIN);
            var y = height - clamp(yRatio, 0, 1) * height;

            return { x: x, y: y };
        });

        var d = plotPoints
            .map(function (point, index) {
                return (index === 0 ? 'M' : 'L') + point.x + ' ' + point.y;
            })
            .join(' ');
        this.layer.path.setAttribute('d', d);

        while (this.layer.pointNodes.length < plotPoints.length) {
            var circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('class', 'revenue-point');
            circle.setAttribute('r', '4');
            this.layer.svg.appendChild(circle);
            this.layer.pointNodes.push(circle);
        }

        while (this.layer.pointNodes.length > plotPoints.length) {
            var extra = this.layer.pointNodes.pop();
            extra.remove();
        }

        while (this.layer.labelNodes.length < plotPoints.length) {
            var group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            var rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');

            rect.setAttribute('class', 'revenue-label-rect');
            rect.setAttribute('rx', '3');
            rect.setAttribute('ry', '3');
            text.setAttribute('class', 'revenue-label-text');

            group.appendChild(rect);
            group.appendChild(text);
            this.layer.svg.appendChild(group);
            this.layer.labelNodes.push({ group: group, rect: rect, text: text });
        }

        while (this.layer.labelNodes.length > plotPoints.length) {
            var extraLabel = this.layer.labelNodes.pop();
            extraLabel.group.remove();
        }

        this.layer.pointNodes.forEach(function (node, index) {
            node.setAttribute('cx', String(plotPoints[index].x));
            node.setAttribute('cy', String(plotPoints[index].y));
        });

        this.layer.labelNodes.forEach(function (node, index) {
            var point = plotPoints[index];
            var value = inWindow[index].y;
            var x = point.x + 6;
            var y = point.y - 8;

            node.text.textContent = formatRevenueLabel(value);
            node.text.setAttribute('x', String(x + 4));
            node.text.setAttribute('y', String(y + 11));

            var bbox = node.text.getBBox();
            node.rect.setAttribute('x', String(bbox.x - 3));
            node.rect.setAttribute('y', String(bbox.y - 2));
            node.rect.setAttribute('width', String(bbox.width + 6));
            node.rect.setAttribute('height', String(bbox.height + 4));
        });
    };

    RevenueOverlay.prototype.show = function () {
        this.visible = true;
        this.container.style.display = 'block';
        this.container.style.visibility = 'visible';
        this.updateBounds();
        this.render();
    };

    RevenueOverlay.prototype.hide = function () {
        this.visible = false;
        this.container.style.display = 'none';
        this.container.style.visibility = 'hidden';
    };

    window.createRevenueOverlay = function (timeline, hostElement) {
        if (!timeline || !hostElement) {
            return null;
        }

        return new RevenueOverlay(timeline, hostElement);
    };
})();
