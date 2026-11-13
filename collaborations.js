(() => {
  const section = document.getElementById("collaborations");
  const map = section.querySelector(".collaboration-map");
  const canvas = map.querySelector("canvas");
  const tooltip = map.querySelector(".collaboration-tooltip");
  const context = canvas.getContext("2d");
  if (!context || typeof d3 === "undefined" || typeof collaborationLand === "undefined" ||
      typeof collaborationData === "undefined") return;

  const locations = collaborationData.locations;

  const mapWidth = canvas.width / 2;
  const mapHeight = canvas.height / 2;
  const markerRadius = 2.8;
  const markerStroke = 0.9;
  context.scale(2, 2);
  const projection = d3.geoEquirectangular()
    .translate([mapWidth / 2, mapHeight / 2])
    .scale(mapWidth / (2 * Math.PI))
    .precision(0.5);
  const path = d3.geoPath(projection, context);
  const graticule = d3.geoGraticule().step([30, 30])();
  const markers = locations.map((location) => {
    const [x, y] = projection(location.coordinates);
    return { location, x, y };
  });

  let activeMarker;
  let dismissTimer = 0;

  function drawMap() {
    context.fillStyle = "#f6faf8";
    context.fillRect(0, 0, mapWidth, mapHeight);
    context.beginPath();
    path(graticule);
    context.lineWidth = 1;
    context.strokeStyle = "#dce8e1";
    context.stroke();
    context.beginPath();
    path(collaborationLand);
    context.fillStyle = "#d8e7df";
    context.fill();
    context.strokeStyle = "#a9bdb2";
    context.strokeRect(0.5, 0.5, mapWidth - 1, mapHeight - 1);

    context.fillStyle = "#315c50";
    context.lineWidth = markerStroke;
    context.strokeStyle = "#fff";
    for (const { x, y } of markers) {
      context.beginPath();
      context.arc(x, y, markerRadius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
  }

  function cancelDismiss() {
    clearTimeout(dismissTimer);
    dismissTimer = 0;
  }

  function hideTooltip() {
    cancelDismiss();
    if (tooltip.hidden) return;
    tooltip.hidden = true;
    activeMarker = undefined;
    canvas.classList.remove("is-over-marker");
    canvas.removeAttribute("aria-describedby");
  }

  function scheduleDismiss() {
    if (!tooltip.hidden && !dismissTimer) dismissTimer = setTimeout(hideTooltip, 350);
  }

  function positionTooltip(marker, bounds) {
    const x = bounds.left + marker.x * bounds.width / mapWidth;
    const y = bounds.top + marker.y * bounds.height / mapHeight;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const inset = 12;
    const gap = 10;
    const rightEdge = window.innerWidth - inset;
    const bottomEdge = window.innerHeight - inset;

    let left = bounds.right + gap;
    let top = y - 12;
    if (left + width > rightEdge) left = bounds.left - gap - width;
    if (left >= inset) {
      top = Math.max(bounds.top, Math.min(top, bounds.bottom - height));
    } else {
      left = x + gap;
      if (left + width > rightEdge) {
        left = x - gap - width;
        if (left < inset) {
          left = x - width / 2;
          top = y + gap + height <= bottomEdge ? y + gap : y - gap - height;
        }
      }
    }
    tooltip.style.left = Math.max(inset, Math.min(left, rightEdge - width)) - bounds.left + "px";
    tooltip.style.top = Math.max(inset, Math.min(top, bottomEdge - height)) - bounds.top + "px";
  }

  function revealAtPointer(event) {
    const bounds = canvas.getBoundingClientRect();
    const scale = mapWidth / bounds.width;
    const x = (event.clientX - bounds.left) * scale;
    const y = (event.clientY - bounds.top) * mapHeight / bounds.height;
    let closest;
    let distance = (event.pointerType === "touch" ? 14 : 8) * scale;
    for (const marker of markers) {
      const next = Math.hypot(marker.x - x, marker.y - y);
      if (next < distance) {
        closest = marker;
        distance = next;
      }
    }
    if (!closest) {
      if (event.pointerType === "touch") hideTooltip();
      else scheduleDismiss();
      return;
    }

    cancelDismiss();
    if (activeMarker === closest) return;

    // Close city centers can share pixels at this scale. Include both in the popup.
    const nearby = markers.filter((marker) => marker !== closest &&
      Math.hypot(marker.x - closest.x, marker.y - closest.y) <= markerRadius * 2 + markerStroke);
    const content = document.createDocumentFragment();
    for (const { location } of [closest, ...nearby]) {
      const city = document.createElement("p");
      city.className = "collaboration-tooltip-city";
      city.textContent = location.city;
      const names = document.createElement("div");
      names.className = "collaboration-tooltip-names";
      names.textContent = Object.keys(location.affiliations).join("\n");
      content.append(city, names);
    }
    tooltip.replaceChildren(content);
    tooltip.scrollTop = 0;
    tooltip.hidden = false;
    activeMarker = closest;
    canvas.classList.add("is-over-marker");
    canvas.setAttribute("aria-describedby", tooltip.id);
    positionTooltip(closest, bounds);
  }

  canvas.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "touch") revealAtPointer(event);
  });
  canvas.addEventListener("pointerup", (event) => {
    if (event.button === 0) revealAtPointer(event);
  });
  canvas.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "touch") scheduleDismiss();
  });
  tooltip.addEventListener("pointerenter", cancelDismiss);
  tooltip.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "touch") scheduleDismiss();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!map.contains(event.target)) hideTooltip();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideTooltip();
  });
  window.addEventListener("resize", hideTooltip);

  drawMap();
  section.hidden = false;
})();
