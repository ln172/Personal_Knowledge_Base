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
  var paginationContainers = Array.prototype.slice.call(document.querySelectorAll("[data-pagination]"));
  var resultsLabel = document.querySelector("[data-results-label]");
  var emptyState = document.querySelector("[data-empty-state]");
  var tagDirectory = document.querySelector("[data-tag-sections]");
  var pageSize = 20;
  var state = {
    keyword: "",
    activeTags: [],
    page: 1
  };

  if (!notes.length) {
    return;
  }

  function readStateFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var tagValue = params.get("tags") || params.get("tag") || "";
    var keywordValue = params.get("q") || "";
    var pageValue = parseInt(params.get("page") || "1", 10);

    state.activeTags = tagValue
      .split(",")
      .map(function (item) {
        return normalizeTag(decodeURIComponent(item));
      })
      .filter(Boolean);
    state.keyword = normalizeText(keywordValue);
    state.page = Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1;
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

    if (cards.length && state.page > 1) {
      params.set("page", String(state.page));
    } else {
      params.delete("page");
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

  function buildVisiblePages(totalPages, currentPage) {
    var candidates = [1, totalPages, currentPage - 1, currentPage, currentPage + 1];
    var pages = candidates.filter(function (page) {
      return page >= 1 && page <= totalPages;
    });

    return pages.filter(function (page, index) {
      return pages.indexOf(page) === index;
    }).sort(function (left, right) {
      return left - right;
    });
  }

  function renderPagination(totalPages, totalCount) {
    if (!paginationContainers.length) {
      return;
    }

    paginationContainers.forEach(function (container) {
      container.innerHTML = "";

      if (totalCount === 0 || totalPages <= 1) {
        container.hidden = true;
        return;
      }

      container.hidden = false;

      var fragment = document.createDocumentFragment();

      function appendButton(label, targetPage, options) {
        var button = document.createElement("button");
        button.className = "pagination__button";
        button.type = "button";
        button.textContent = label;

        if (options && options.current) {
          button.classList.add("is-current");
          button.setAttribute("aria-current", "page");
          button.disabled = true;
        } else {
          button.dataset.pageTarget = String(targetPage);
        }

        if (options && options.disabled) {
          button.disabled = true;
        }

        fragment.appendChild(button);
      }

      function appendEllipsis() {
        var ellipsis = document.createElement("span");
        ellipsis.className = "pagination__ellipsis";
        ellipsis.textContent = "...";
        fragment.appendChild(ellipsis);
      }

      appendButton("上一页", state.page - 1, { disabled: state.page === 1 });

      buildVisiblePages(totalPages, state.page).forEach(function (page, index, pages) {
        if (index > 0 && page - pages[index - 1] > 1) {
          appendEllipsis();
        }

        appendButton(String(page), page, { current: page === state.page });
      });

      appendButton("下一页", state.page + 1, { disabled: state.page === totalPages });
      container.appendChild(fragment);
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

    var totalPages = Math.max(1, Math.ceil(filteredNotes.length / pageSize));
    state.page = Math.min(Math.max(state.page, 1), totalPages);

    var start = (state.page - 1) * pageSize;
    var end = start + pageSize;
    var visibleUrls = new Set(
      filteredNotes.slice(start, end).map(function (note) {
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

    if (filteredNotes.length === 0) {
      setResultsText("共 0 篇日记");
    } else {
      setResultsText("共 " + filteredNotes.length + " 篇日记，第 " + state.page + " / " + totalPages + " 页");
    }

    if (emptyState) {
      emptyState.hidden = filteredNotes.length > 0;
    }

    renderPagination(totalPages, filteredNotes.length);
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

    if (cards.length) {
      applyCardFiltering(filteredNotes);
    } else {
      state.page = 1;
    }

    if (tagDirectory) {
      buildTagDirectory(filteredNotes);
    } else if (!cards.length && emptyState) {
      emptyState.hidden = filteredNotes.length > 0;
    }

    writeStateToUrl();
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
    var pageButton = event.target.closest("[data-page-target]");

    if (chip) {
      toggleTag(chip.dataset.tagValue);
      state.page = 1;
      applyFilters();
      return;
    }

    if (clearButton) {
      state.activeTags = [];
      state.keyword = "";
      state.page = 1;
      applyFilters();
      return;
    }

    if (pageButton) {
      state.page = parseInt(pageButton.dataset.pageTarget || "1", 10);
      applyFilters();
    }
  });

  searchInputs.forEach(function (input) {
    input.addEventListener("input", function (event) {
      state.keyword = normalizeText(event.target.value);
      state.page = 1;
      applyFilters();
    });
  });

  readStateFromUrl();
  applyFilters();
})();
