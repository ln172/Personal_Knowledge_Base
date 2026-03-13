(function () {
  function readNotes() {
    var dataElement = document.getElementById("notes-data");

    if (!dataElement) {
      return [];
    }

    try {
      var parsed = JSON.parse(dataElement.textContent);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Failed to parse notes data.", error);
      return [];
    }
  }

  function normalizeTag(value) {
    return String(value || "").trim().toLowerCase();
  }

  function normalizeText(value) {
    return String(value || "").trim().toLowerCase();
  }

  function buildUniqueTags(notes) {
    var seen = new Set();
    var tags = [];

    notes.forEach(function (note) {
      (note.tags || []).forEach(function (tag) {
        var normalized = normalizeTag(tag);

        if (!normalized || seen.has(normalized)) {
          return;
        }

        seen.add(normalized);
        tags.push({
          raw: tag,
          normalized: normalized
        });
      });
    });

    return tags.sort(function (left, right) {
      return left.raw.localeCompare(right.raw, "zh-Hans-CN");
    });
  }

  var notes = readNotes();
  var cards = Array.prototype.slice.call(document.querySelectorAll("[data-note-card]"));
  var tagFilterContainers = Array.prototype.slice.call(document.querySelectorAll("[data-tag-filter]"));
  var searchInputs = Array.prototype.slice.call(document.querySelectorAll("[data-note-search]"));
  var clearButtons = Array.prototype.slice.call(document.querySelectorAll("[data-clear-filters]"));
  var resultsLabel = document.querySelector("[data-results-label]");
  var emptyState = document.querySelector("[data-empty-state]");
  var tagDirectory = document.querySelector("[data-tag-sections]");
  var state = {
    keyword: "",
    activeTags: []
  };

  if (!notes.length) {
    return;
  }

  function readStateFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var tagValue = params.get("tags") || params.get("tag") || "";
    var keywordValue = params.get("q") || "";

    state.activeTags = tagValue
      .split(",")
      .map(function (item) {
        return normalizeTag(decodeURIComponent(item));
      })
      .filter(Boolean);
    state.keyword = normalizeText(keywordValue);
  }

  function writeStateToUrl() {
    var params = new URLSearchParams(window.location.search);

    if (state.activeTags.length) {
      params.set("tags", state.activeTags.join(","));
      params.delete("tag");
    } else {
      params.delete("tags");
      params.delete("tag");
    }

    if (state.keyword) {
      params.set("q", state.keyword);
    } else {
      params.delete("q");
    }

    var query = params.toString();
    var nextUrl = query ? window.location.pathname + "?" + query : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }

  function renderTagFilters() {
    var tags = buildUniqueTags(notes);

    tagFilterContainers.forEach(function (container) {
      container.innerHTML = "";

      tags.forEach(function (tag) {
        var button = document.createElement("button");
        button.className = "tag-chip";
        button.type = "button";
        button.dataset.tagValue = tag.normalized;
        button.textContent = "#" + tag.raw;

        if (state.activeTags.indexOf(tag.normalized) !== -1) {
          button.classList.add("is-active");
        }

        container.appendChild(button);
      });
    });
  }

  function updateSearchInputs() {
    searchInputs.forEach(function (input) {
      if (input.value !== state.keyword) {
        input.value = state.keyword;
      }
    });
  }

  function setResultsText(text) {
    if (resultsLabel) {
      resultsLabel.textContent = text;
    }
  }

  function updateClearButtons() {
    var isDirty = Boolean(state.keyword || state.activeTags.length);

    clearButtons.forEach(function (button) {
      button.hidden = !isDirty;
    });
  }

  function getFilteredNotes() {
    return notes.filter(function (note) {
      var normalizedTags = (note.tags || []).map(normalizeTag);
      var searchBlob = normalizeText([
        note.title,
        note.summary,
        (note.tags || []).join(" ")
      ].join(" "));
      var matchesTags = state.activeTags.every(function (tag) {
        return normalizedTags.indexOf(tag) !== -1;
      });
      var matchesKeyword = !state.keyword || searchBlob.indexOf(state.keyword) !== -1;
      return matchesTags && matchesKeyword;
    });
  }

  function applyCardFiltering(filteredNotes) {
    if (!cards.length) {
      return;
    }

    var visibleUrls = new Set(
      filteredNotes.map(function (note) {
        return note.url;
      })
    );

    var visibleCount = 0;

    cards.forEach(function (card) {
      var titleLink = card.querySelector("h3 a");
      var url = titleLink ? titleLink.getAttribute("href") : "";
      var shouldShow = visibleUrls.has(url);

      card.hidden = !shouldShow;

      if (shouldShow) {
        visibleCount += 1;
      }
    });

    setResultsText("共 " + visibleCount + " 篇日记");

    if (emptyState) {
      emptyState.hidden = visibleCount > 0;
    }
  }

  function buildTagDirectory(filteredNotes) {
    if (!tagDirectory) {
      return;
    }

    var groups = {};

    filteredNotes.forEach(function (note) {
      (note.tags || []).forEach(function (tag) {
        var normalized = normalizeTag(tag);

        if (!groups[normalized]) {
          groups[normalized] = {
            raw: tag,
            notes: []
          };
        }

        groups[normalized].notes.push(note);
      });
    });

    var tags = Object.keys(groups).sort(function (left, right) {
      return groups[left].raw.localeCompare(groups[right].raw, "zh-Hans-CN");
    });

    tagDirectory.innerHTML = "";

    if (!tags.length) {
      setResultsText("共 0 个标签分组");
      if (emptyState) {
        emptyState.hidden = false;
      }
      return;
    }

    tags.forEach(function (normalizedTag) {
      var group = groups[normalizedTag];
      var section = document.createElement("section");
      section.className = "tag-section";

      var head = document.createElement("div");
      head.className = "tag-section__head";

      var title = document.createElement("h3");
      title.textContent = "#" + group.raw;

      var count = document.createElement("p");
      count.className = "tag-directory__count";
      count.textContent = group.notes.length + " 篇日记";

      head.appendChild(title);
      head.appendChild(count);
      section.appendChild(head);

      var list = document.createElement("div");
      list.className = "tag-section__list";

      group.notes
        .slice()
        .sort(function (left, right) {
          return right.date.localeCompare(left.date);
        })
        .forEach(function (note) {
          var link = document.createElement("a");
          link.className = "tag-note-link";
          link.href = note.url;

          var heading = document.createElement("strong");
          heading.textContent = note.title;

          var meta = document.createElement("span");
          meta.textContent = note.date + " · " + note.summary;

          link.appendChild(heading);
          link.appendChild(meta);
          list.appendChild(link);
        });

      section.appendChild(list);
      tagDirectory.appendChild(section);
    });

    setResultsText("共 " + tags.length + " 个标签分组");

    if (emptyState) {
      emptyState.hidden = true;
    }
  }

  function applyFilters() {
    var filteredNotes = getFilteredNotes();

    renderTagFilters();
    updateSearchInputs();
    updateClearButtons();
    writeStateToUrl();

    if (cards.length) {
      applyCardFiltering(filteredNotes);
    }

    if (tagDirectory) {
      buildTagDirectory(filteredNotes);
    } else if (!cards.length && emptyState) {
      emptyState.hidden = filteredNotes.length > 0;
    }
  }

  function toggleTag(tagValue) {
    var index = state.activeTags.indexOf(tagValue);

    if (index === -1) {
      state.activeTags.push(tagValue);
    } else {
      state.activeTags.splice(index, 1);
    }
  }

  document.addEventListener("click", function (event) {
    var chip = event.target.closest("[data-tag-value]");
    var clearButton = event.target.closest("[data-clear-filters]");

    if (chip) {
      toggleTag(chip.dataset.tagValue);
      applyFilters();
      return;
    }

    if (clearButton) {
      state.activeTags = [];
      state.keyword = "";
      applyFilters();
    }
  });

  searchInputs.forEach(function (input) {
    input.addEventListener("input", function (event) {
      state.keyword = normalizeText(event.target.value);
      applyFilters();
    });
  });

  readStateFromUrl();
  applyFilters();
})();

