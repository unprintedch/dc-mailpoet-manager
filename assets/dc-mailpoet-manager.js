/**
 * DC MailPoet Manager – vanilla JS admin app.
 *
 * No jQuery. No React. No build step.
 * Uses fetch() + WP REST API nonce.
 *
 * @package DC_MailPoet_Manager
 */
(function () {
	'use strict';

	/* ------------------------------------------------------------------ */
	/*  Config                                                             */
	/* ------------------------------------------------------------------ */
	var CFG = window.DC_MAILPOET || {};

	/* ------------------------------------------------------------------ */
	/*  State                                                              */
	/* ------------------------------------------------------------------ */
	var state = {
		meta: { tags: [], lists: [], custom_fields: [], npa_field_id: null },
		filters: {
			search: '',
			status: '',
			npa: '',
			npa_min: '',
			npa_max: '',
			tags: [],
			tags_mode: 'any',
			lists: [],
			lists_mode: 'any',
		},
		page: 1,
		per_page: CFG.perPageDefault || 50,
		sort: 'created_at',
		order: 'desc',
		items: [],
		total: 0,
		selected: new Set(),
		loading: false,
		bulkRunning: false,
	};

	/* ------------------------------------------------------------------ */
	/*  DOM refs (cached after DOMContentLoaded)                           */
	/* ------------------------------------------------------------------ */
	var dom = {};

	/* ------------------------------------------------------------------ */
	/*  Helpers                                                            */
	/* ------------------------------------------------------------------ */
	function esc(str) {
		var d = document.createElement('div');
		d.textContent = str;
		return d.innerHTML;
	}

	function debounce(fn, ms) {
		var t;
		return function () {
			clearTimeout(t);
			t = setTimeout(fn, ms);
		};
	}

	/* ------------------------------------------------------------------ */
	/*  API                                                                */
	/* ------------------------------------------------------------------ */
	var api = {
		get: function (endpoint, params) {
			var url = new URL(CFG.restUrl + endpoint, window.location.origin);
			if (params) {
				Object.keys(params).forEach(function (k) {
					var v = params[k];
					if (v === null || v === undefined || v === '') return;
					if (Array.isArray(v)) {
						v.forEach(function (item) { url.searchParams.append(k + '[]', item); });
					} else {
						url.searchParams.set(k, v);
					}
				});
			}
			return fetch(url.toString(), {
				headers: { 'X-WP-Nonce': CFG.nonce },
			}).then(function (r) {
				if (!r.ok) throw new Error('HTTP ' + r.status);
				return r.json();
			});
		},

		post: function (endpoint, body) {
			return fetch(CFG.restUrl + endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-WP-Nonce': CFG.nonce,
				},
				body: JSON.stringify(body),
			}).then(function (r) {
				if (!r.ok) throw new Error('HTTP ' + r.status);
				return r.json();
			});
		},
	};

	/* ------------------------------------------------------------------ */
	/*  Fetch meta                                                         */
	/* ------------------------------------------------------------------ */
	function fetchMeta() {
		return api.get('meta').then(function (data) {
			state.meta.tags = data.tags || [];
			state.meta.lists = data.lists || [];
			state.meta.custom_fields = data.custom_fields || [];
			state.meta.npa_field_id = data.suggested_npa_field_id || null;
			renderDropdownCheckboxes('tags');
			renderDropdownCheckboxes('lists');
		});
	}

	/* ------------------------------------------------------------------ */
	/*  Fetch subscribers                                                  */
	/* ------------------------------------------------------------------ */
	function fetchSubscribers() {
		state.loading = true;
		showLoading();

		var params = {
			page: state.page,
			per_page: state.per_page,
			search: state.filters.search,
			status: state.filters.status,
			npa: state.filters.npa,
			npa_min: state.filters.npa_min,
			npa_max: state.filters.npa_max,
			tags: state.filters.tags,
			tags_mode: state.filters.tags_mode,
			lists: state.filters.lists,
			lists_mode: state.filters.lists_mode,
			sort: state.sort,
			order: state.order,
		};

		if (state.meta.npa_field_id) {
			params.npa_field_id = state.meta.npa_field_id;
		}

		return api.get('subscribers', params).then(function (data) {
			state.items = data.items || [];
			state.total = data.total || 0;
			state.loading = false;
			renderTable();
			renderPagination();
			updateBulkBar();
		}).catch(function (err) {
			state.loading = false;
			dom.tbody.innerHTML = '<tr><td colspan="9">Error: ' + esc(err.message) + '</td></tr>';
		});
	}

	/* ------------------------------------------------------------------ */
	/*  Render: dropdown checkboxes (tags / lists)                         */
	/* ------------------------------------------------------------------ */
	function renderDropdownCheckboxes(type) {
		var list = type === 'tags' ? state.meta.tags : state.meta.lists;
		var container = document.getElementById('dcmm-' + type + '-list');
		if (!container) return;

		container.innerHTML = list.map(function (item) {
			return '<label class="dcmm-dropdown-item">' +
				'<input type="checkbox" value="' + item.id + '" data-type="' + type + '"> ' +
				esc(item.name) +
				'</label>';
		}).join('');
	}

	/* ------------------------------------------------------------------ */
	/*  Render: loading state                                              */
	/* ------------------------------------------------------------------ */
	function showLoading() {
		var cols = 9;
		var rows = '';
		for (var i = 0; i < 5; i++) {
			rows += '<tr>';
			for (var j = 0; j < cols; j++) {
				rows += '<td><span class="dcmm-skeleton"></span></td>';
			}
			rows += '</tr>';
		}
		dom.tbody.innerHTML = rows;
	}

	/* ------------------------------------------------------------------ */
	/*  Render: table rows                                                 */
	/* ------------------------------------------------------------------ */
	function renderTable() {
		if (!state.items.length) {
			dom.tbody.innerHTML = '<tr><td colspan="9">No subscribers found.</td></tr>';
			return;
		}

		var html = '';
		state.items.forEach(function (s) {
			var checked = state.selected.has(s.id) ? ' checked' : '';
			var rowClass = state.selected.has(s.id) ? ' class="dcmm-selected"' : '';

			var tagsPills = (s.tags || []).map(function (t) {
				return '<span class="dcmm-pill dcmm-pill--tag">' + esc(t.name) + '</span>';
			}).join(' ');

			var listsPills = (s.lists || []).map(function (l) {
				return '<span class="dcmm-pill dcmm-pill--list">' + esc(l.name) + '</span>';
			}).join(' ');

			html += '<tr' + rowClass + '>' +
				'<td class="dcmm-col-cb"><input type="checkbox" class="dcmm-row-cb" value="' + s.id + '"' + checked + '></td>' +
				'<td>' + esc(s.email) + '</td>' +
				'<td>' + esc(s.first_name) + '</td>' +
				'<td>' + esc(s.last_name) + '</td>' +
				'<td><span class="dcmm-status dcmm-status--' + esc(s.status) + '">' + esc(s.status) + '</span></td>' +
				'<td>' + (s.npa !== null ? esc(String(s.npa)) : '—') + '</td>' +
				'<td>' + (tagsPills || '—') + '</td>' +
				'<td>' + (listsPills || '—') + '</td>' +
				'<td>' + esc(s.created_at ? s.created_at.substring(0, 10) : '') + '</td>' +
				'</tr>';
		});

		dom.tbody.innerHTML = html;

		// Update header checkbox state.
		var pageIds = state.items.map(function (s) { return s.id; });
		var allChecked = pageIds.length > 0 && pageIds.every(function (id) { return state.selected.has(id); });
		dom.selectAll.checked = allChecked;
	}

	/* ------------------------------------------------------------------ */
	/*  Render: sort indicators                                            */
	/* ------------------------------------------------------------------ */
	function updateSortHeaders() {
		document.querySelectorAll('.dcmm-sortable').forEach(function (th) {
			th.classList.remove('dcmm-sort-asc', 'dcmm-sort-desc');
			if (th.dataset.sort === state.sort) {
				th.classList.add('dcmm-sort-' + state.order);
			}
		});
	}

	/* ------------------------------------------------------------------ */
	/*  Render: pagination                                                 */
	/* ------------------------------------------------------------------ */
	function renderPagination() {
		var totalPages = Math.ceil(state.total / state.per_page) || 1;

		var html = '<span class="dcmm-page-info">' +
			state.total + ' subscriber' + (state.total !== 1 ? 's' : '') +
			' — page ' + state.page + ' / ' + totalPages +
			'</span>';

		html += '<span class="dcmm-page-buttons">';
		html += '<button class="button" data-page="1"' + (state.page <= 1 ? ' disabled' : '') + '>&laquo;</button>';
		html += '<button class="button" data-page="' + (state.page - 1) + '"' + (state.page <= 1 ? ' disabled' : '') + '>&lsaquo;</button>';
		html += '<button class="button" data-page="' + (state.page + 1) + '"' + (state.page >= totalPages ? ' disabled' : '') + '>&rsaquo;</button>';
		html += '<button class="button" data-page="' + totalPages + '"' + (state.page >= totalPages ? ' disabled' : '') + '>&raquo;</button>';
		html += '</span>';

		dom.pagination.innerHTML = html;
	}

	/* ------------------------------------------------------------------ */
	/*  Bulk bar visibility                                                */
	/* ------------------------------------------------------------------ */
	function updateBulkBar() {
		var count = state.selected.size;
		dom.bulk.style.display = count > 0 ? '' : 'none';
		dom.bulkCount.textContent = count + ' selected';
	}

	/* ------------------------------------------------------------------ */
	/*  Populate bulk target selector (tags or lists)                      */
	/* ------------------------------------------------------------------ */
	function updateBulkTarget() {
		var action = dom.bulkAction.value;
		var target = dom.bulkTarget;
		var applyBtn = dom.bulkApply;

		target.style.display = 'none';
		target.innerHTML = '';
		applyBtn.disabled = !action;

		if (action === 'add_tag' || action === 'remove_tag') {
			target.style.display = '';
			target.innerHTML = '<option value="">— Select tag —</option>' +
				state.meta.tags.map(function (t) {
					return '<option value="' + t.id + '">' + esc(t.name) + '</option>';
				}).join('');
			applyBtn.disabled = true;
		} else if (action === 'add_list' || action === 'remove_list') {
			target.style.display = '';
			target.innerHTML = '<option value="">— Select list —</option>' +
				state.meta.lists.map(function (l) {
					return '<option value="' + l.id + '">' + esc(l.name) + '</option>';
				}).join('');
			applyBtn.disabled = true;
		}
	}

	/* ------------------------------------------------------------------ */
	/*  Run bulk action (chunked loop)                                     */
	/* ------------------------------------------------------------------ */
	function runBulk() {
		var action = dom.bulkAction.value;
		if (!action) return;

		var ids = Array.from(state.selected);
		if (!ids.length) return;

		var tag_ids = [];
		var list_ids = [];
		var targetVal = dom.bulkTarget.value;

		if (action === 'add_tag' || action === 'remove_tag') {
			if (!targetVal) return;
			tag_ids = [parseInt(targetVal, 10)];
		} else if (action === 'add_list' || action === 'remove_list') {
			if (!targetVal) return;
			list_ids = [parseInt(targetVal, 10)];
		}

		state.bulkRunning = true;
		dom.bulkApply.disabled = true;
		dom.bulkProgress.style.display = '';
		dom.bulkDownload.style.display = 'none';

		var total = ids.length;

		function chunk(offset) {
			var pct = total > 0 ? Math.round((offset / total) * 100) : 0;
			dom.progressFill.style.width = pct + '%';
			dom.progressText.textContent = offset + ' / ' + total;

			return api.post('bulk', {
				action: action,
				ids: ids,
				tag_ids: tag_ids,
				list_ids: list_ids,
				offset: offset,
				limit: 500,
			}).then(function (res) {
				if (!res.ok) {
					throw new Error(res.message || 'Bulk action failed');
				}

				// Show final progress.
				var donePct = total > 0 ? Math.round((res.processed / total) * 100) : 100;
				dom.progressFill.style.width = donePct + '%';
				dom.progressText.textContent = res.processed + ' / ' + total;

				if (res.download_url) {
					dom.bulkDownload.href = res.download_url;
					dom.bulkDownload.style.display = '';
				}

				if (res.next_offset !== null && res.next_offset !== undefined) {
					return chunk(res.next_offset);
				}

				// Done.
				state.bulkRunning = false;
				dom.bulkApply.disabled = false;
				dom.progressText.textContent = 'Done — ' + total + ' processed';
				fetchSubscribers();
			}).catch(function (err) {
				state.bulkRunning = false;
				dom.bulkApply.disabled = false;
				dom.progressText.textContent = 'Error: ' + err.message;
			});
		}

		chunk(0);
	}

	/* ------------------------------------------------------------------ */
	/*  Event: filter changes (debounced for text inputs)                  */
	/* ------------------------------------------------------------------ */
	function onFilterChange() {
		state.page = 1;
		fetchSubscribers();
	}

	var debouncedFilterChange = debounce(onFilterChange, 300);

	/* ------------------------------------------------------------------ */
	/*  Event: bind all listeners                                          */
	/* ------------------------------------------------------------------ */
	function bindEvents() {
		// Search.
		dom.search.addEventListener('input', function () {
			state.filters.search = this.value;
			debouncedFilterChange();
		});

		// Status.
		dom.status.addEventListener('change', function () {
			state.filters.status = this.value;
			onFilterChange();
		});

		// NPA inputs.
		dom.npa.addEventListener('input', function () {
			state.filters.npa = this.value;
			debouncedFilterChange();
		});
		dom.npaMin.addEventListener('input', function () {
			state.filters.npa_min = this.value;
			debouncedFilterChange();
		});
		dom.npaMax.addEventListener('input', function () {
			state.filters.npa_max = this.value;
			debouncedFilterChange();
		});

		// Per page.
		dom.perPage.addEventListener('change', function () {
			state.per_page = parseInt(this.value, 10);
			state.page = 1;
			fetchSubscribers();
		});

		// Tag/list dropdown checkboxes (delegated).
		document.getElementById('dcmm-tags-list').addEventListener('change', function (e) {
			if (e.target.type !== 'checkbox') return;
			state.filters.tags = getCheckedValues('dcmm-tags-list');
			updateDropdownCount('tags');
			onFilterChange();
		});
		document.getElementById('dcmm-lists-list').addEventListener('change', function (e) {
			if (e.target.type !== 'checkbox') return;
			state.filters.lists = getCheckedValues('dcmm-lists-list');
			updateDropdownCount('lists');
			onFilterChange();
		});

		// Tags/lists mode radio.
		document.querySelectorAll('input[name="dcmm-tags-mode"]').forEach(function (r) {
			r.addEventListener('change', function () {
				state.filters.tags_mode = this.value;
				if (state.filters.tags.length) onFilterChange();
			});
		});
		document.querySelectorAll('input[name="dcmm-lists-mode"]').forEach(function (r) {
			r.addEventListener('change', function () {
				state.filters.lists_mode = this.value;
				if (state.filters.lists.length) onFilterChange();
			});
		});

		// Dropdown toggle.
		document.querySelectorAll('.dcmm-dropdown-toggle').forEach(function (btn) {
			btn.addEventListener('click', function (e) {
				e.stopPropagation();
				var panel = this.nextElementSibling;
				var isOpen = panel.classList.contains('dcmm-open');
				closeAllDropdowns();
				if (!isOpen) panel.classList.add('dcmm-open');
			});
		});

		// Close dropdowns on outside click.
		document.addEventListener('click', function (e) {
			if (!e.target.closest('.dcmm-dropdown')) {
				closeAllDropdowns();
			}
		});

		// Sort headers.
		document.querySelectorAll('.dcmm-sortable').forEach(function (th) {
			th.addEventListener('click', function () {
				var col = this.dataset.sort;
				if (state.sort === col) {
					state.order = state.order === 'asc' ? 'desc' : 'asc';
				} else {
					state.sort = col;
					state.order = 'asc';
				}
				updateSortHeaders();
				fetchSubscribers();
			});
		});

		// Select all checkbox.
		dom.selectAll.addEventListener('change', function () {
			var checked = this.checked;
			state.items.forEach(function (s) {
				if (checked) {
					state.selected.add(s.id);
				} else {
					state.selected.delete(s.id);
				}
			});
			renderTable();
			updateBulkBar();
		});

		// Row checkboxes (delegated).
		dom.tbody.addEventListener('change', function (e) {
			if (!e.target.classList.contains('dcmm-row-cb')) return;
			var id = parseInt(e.target.value, 10);
			if (e.target.checked) {
				state.selected.add(id);
			} else {
				state.selected.delete(id);
			}
			renderTable();
			updateBulkBar();
		});

		// Pagination (delegated).
		dom.pagination.addEventListener('click', function (e) {
			var btn = e.target.closest('button[data-page]');
			if (!btn || btn.disabled) return;
			state.page = parseInt(btn.dataset.page, 10);
			fetchSubscribers();
		});

		// Bulk action select.
		dom.bulkAction.addEventListener('change', updateBulkTarget);

		// Bulk target select.
		dom.bulkTarget.addEventListener('change', function () {
			dom.bulkApply.disabled = !this.value;
		});

		// Bulk apply.
		dom.bulkApply.addEventListener('click', function () {
			if (state.bulkRunning) return;
			runBulk();
		});
	}

	/* ------------------------------------------------------------------ */
	/*  Dropdown helpers                                                   */
	/* ------------------------------------------------------------------ */
	function closeAllDropdowns() {
		document.querySelectorAll('.dcmm-dropdown-panel.dcmm-open').forEach(function (p) {
			p.classList.remove('dcmm-open');
		});
	}

	function getCheckedValues(containerId) {
		var checks = document.querySelectorAll('#' + containerId + ' input[type="checkbox"]:checked');
		return Array.from(checks).map(function (cb) { return parseInt(cb.value, 10); });
	}

	function updateDropdownCount(type) {
		var arr = type === 'tags' ? state.filters.tags : state.filters.lists;
		var badge = document.getElementById('dcmm-' + type + '-count');
		badge.textContent = arr.length ? arr.length : '';
	}

	/* ------------------------------------------------------------------ */
	/*  Init                                                               */
	/* ------------------------------------------------------------------ */
	document.addEventListener('DOMContentLoaded', function () {
		dom.search = document.getElementById('dcmm-search');
		dom.status = document.getElementById('dcmm-status');
		dom.npa = document.getElementById('dcmm-npa');
		dom.npaMin = document.getElementById('dcmm-npa-min');
		dom.npaMax = document.getElementById('dcmm-npa-max');
		dom.perPage = document.getElementById('dcmm-per-page');
		dom.tbody = document.getElementById('dcmm-tbody');
		dom.selectAll = document.getElementById('dcmm-select-all');
		dom.pagination = document.getElementById('dcmm-pagination');
		dom.bulk = document.getElementById('dcmm-bulk');
		dom.bulkCount = document.getElementById('dcmm-bulk-count');
		dom.bulkAction = document.getElementById('dcmm-bulk-action');
		dom.bulkTarget = document.getElementById('dcmm-bulk-target');
		dom.bulkApply = document.getElementById('dcmm-bulk-apply');
		dom.bulkProgress = document.getElementById('dcmm-bulk-progress');
		dom.progressFill = document.getElementById('dcmm-progress-fill');
		dom.progressText = document.getElementById('dcmm-progress-text');
		dom.bulkDownload = document.getElementById('dcmm-bulk-download');

		// Bail if not on our page.
		if (!dom.tbody) return;

		bindEvents();
		updateSortHeaders();

		fetchMeta().then(function () {
			fetchSubscribers();
		}).catch(function (err) {
			dom.tbody.innerHTML = '<tr><td colspan="9">Failed to load metadata: ' + esc(err.message) + '</td></tr>';
		});
	});
})();
