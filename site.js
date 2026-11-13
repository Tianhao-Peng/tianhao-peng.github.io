const controls = document.querySelector(".publication-controls");
const filters = controls.querySelectorAll("[data-filter]");
const agentControls = controls.querySelector(".agent-filters");
const agentFilters = agentControls.querySelectorAll("[data-agent-filter]");
const paperList = document.querySelector(".paper-list");
const papers = Array.from(paperList.querySelectorAll(".paper"));
const authorHeading = paperList.querySelector("#author-publications");
const admireHeading = paperList.querySelector("#admire-publications");
const resultCount = controls.querySelector(".result-count");
const venuePriorities = { a: 0, preprint: 2 };
const papersByVenue = [...papers].sort((left, right) =>
  (venuePriorities[left.dataset.venuePriority] ?? 1) -
  (venuePriorities[right.dataset.venuePriority] ?? 1)
);

function isInAll(paper) {
  return paper.hasAttribute("data-lead-author") || paper.hasAttribute("data-corresponding-author");
}

function filterPapers(topic, agentType = "all") {
  const showAll = topic === "all";
  const showAgents = topic === "agents";
  filters.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.filter === topic));
  });
  agentControls.hidden = !showAgents;
  agentFilters.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.agentFilter === agentType));
  });

  const authorPapers = [];
  const admirePapers = [];
  const orderedPapers = showAll ? papers : papersByVenue;
  orderedPapers.forEach((paper) => {
    const matches = showAll
      ? isInAll(paper)
      : paper.dataset.topic === topic &&
        (agentType === "all" || paper.dataset.subtopic === agentType);
    paper.hidden = !matches;
    if (!matches) return;
    const group = paper.hasAttribute("data-group-publication") ? admirePapers : authorPapers;
    group.push(paper);
  });

  authorHeading.hidden = showAll || authorPapers.length === 0;
  admireHeading.hidden = admirePapers.length === 0;
  paperList.append(authorHeading, ...authorPapers, admireHeading, ...admirePapers);

  const visibleCount = authorPapers.length + admirePapers.length;
  resultCount.textContent = showAll
    ? `${visibleCount} papers as first, co-first, or corresponding author`
    : `${visibleCount} papers`;
}

filters.forEach((button) => {
  button.addEventListener("click", () => filterPapers(button.dataset.filter));
});
agentFilters.forEach((button) => {
  button.addEventListener("click", () => filterPapers("agents", button.dataset.agentFilter));
});

function revealPaper(hash) {
  const paper = papers.find((item) => `#${item.id}` === hash);
  if (paper?.hidden) {
    filterPapers(isInAll(paper) ? "all" : paper.dataset.topic);
    return paper;
  }
}

// Reveal filtered papers before the browser follows a link.
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", () => revealPaper(link.hash));
});

function revealLinkedPaper() {
  revealPaper(window.location.hash)?.scrollIntoView();
}

window.addEventListener("hashchange", revealLinkedPaper);
filterPapers("all");
controls.hidden = false;
revealLinkedPaper();

const emailButton = document.querySelector(".profile-email");
emailButton.addEventListener("click", () => {
  const mailbox = ["tianhao", "peng"].join(".");
  const domain = ["ntu", "edu", "sg"].join(".");
  const address = [mailbox, domain].join("@");
  const link = document.createElement("a");
  link.href = "mailto:" + address;
  link.textContent = address;
  emailButton.replaceWith(link);
  link.focus();
}, { once: true });
emailButton.parentElement.hidden = false;
