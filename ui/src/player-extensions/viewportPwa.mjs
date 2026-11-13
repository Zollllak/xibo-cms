/* Existing deployed PWA viewport correction, extracted without duplicating player bootstrap. GNU AGPL-3.0-or-later. */
export function installViewportFix(Renderer) {
  const proto = Renderer.prototype;
  const calculateScale = proto.calculateScale;
  proto.calculateScale = function(layout) {
    this._regionLayouts ||= new WeakMap();
    for (const config of layout.regions || []) this._regionLayouts.set(config, layout);
    return calculateScale.call(this, layout);
  };

  function fitFrames(element, config) {
    const scale = parseFloat(element.style.width) / config.width;
    if (!(scale > 0)) return;
    for (const frame of element.querySelectorAll('iframe[data-xibo-design-viewport]')) {
      frame.style.transform = `scale(${scale})`;
    }
  }

  // Preloading or overlays must not borrow the active layout's geometry.
  const applyRegionScale = proto.applyRegionScale;
  proto.applyRegionScale = function(element, config) {
    const layout = this._regionLayouts?.get(config);
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    if (layout) {
      const scale = Math.min(width / layout.width, height / layout.height);
      Object.assign(element.style, {
        left: `${config.left * scale + (width - layout.width * scale) / 2}px`,
        top: `${config.top * scale + (height - layout.height * scale) / 2}px`,
        width: `${config.width * scale}px`,
        height: `${config.height * scale}px`
      });
    } else applyRegionScale.call(this, element, config);
    fitFrames(element, config);
  };

  proto.rescaleRegions = function() {
    const groups = [];
    if (this.currentLayout) groups.push({layout: this.currentLayout, regions: this.regions});
    groups.push(...this.activeOverlays.values(), ...this.layoutPool.layouts.values());
    for (const group of groups) {
      this.calculateScale(group.layout);
      for (const region of group.regions.values()) {
        this.applyRegionScale(region.element, region.config);
        region.width = parseFloat(region.element.style.width);
        region.height = parseFloat(region.element.style.height);
      }
    }
    if (this.currentLayout) this.calculateScale(this.currentLayout);
  };

  const renderGenericWidget = proto.renderGenericWidget;
  proto.renderGenericWidget = async function(widget, region) {
    const frame = await renderGenericWidget.call(this, widget, region);
    // Keep transforms used by transitions on a separate wrapper.
    const wrapper = document.createElement('div');
    wrapper.className = 'renderer-lite-widget';
    frame.dataset.xiboDesignViewport = 'true';
    frame.style.setProperty('width', `${region.config.width}px`, 'important');
    frame.style.setProperty('height', `${region.config.height}px`, 'important');
    Object.assign(frame.style, {position: 'absolute', left: '0', top: '0', transformOrigin: '0 0', opacity: '1'});
    wrapper.appendChild(frame);
    fitFrames(region.element, region.config);
    const scale = parseFloat(region.element.style.width) / region.config.width;
    frame.style.transform = `scale(${scale > 0 ? scale : 1})`;
    return wrapper;
  };

  const swap = proto._swapToPreloadedLayout;
  proto._swapToPreloadedLayout = function(...args) {
    // Resize hidden regions before making them visible, including warm iframes.
    this.rescaleRegions();
    return swap.apply(this, args);
  };

  const setup = proto.setupContainer;
  proto.setupContainer = function() {
    setup.call(this);
    this._viewportChanged = () => this.rescaleRegions();
    window.addEventListener('resize', this._viewportChanged);
    document.addEventListener('fullscreenchange', this._viewportChanged);
    window.visualViewport?.addEventListener('resize', this._viewportChanged);
  };
  const cleanup = proto.cleanup;
  proto.cleanup = function() {
    window.removeEventListener('resize', this._viewportChanged);
    document.removeEventListener('fullscreenchange', this._viewportChanged);
    window.visualViewport?.removeEventListener('resize', this._viewportChanged);
    return cleanup.call(this);
  };
}
