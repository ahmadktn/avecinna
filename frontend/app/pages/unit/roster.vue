<template>
  <div class="min-h-screen bg-slate-50 font-sans">
    <AppSidebar />

    <div class="pl-64 lg:pl-72 flex flex-col min-h-screen">
      <AppNavbar @openWardSwitcher="showWardSwitcher = true" />

      <main class="flex-1 w-full px-8 py-8 space-y-8">
        <!-- Page Header -->
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2">
              <NuxtLink to="/unit" class="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Unit Overview</span>
              </NuxtLink>
              <span class="text-slate-300">/</span>
              <span class="text-xs font-medium text-slate-500">Roster Management</span>
            </div>
            <h1 class="text-2xl font-bold text-slate-900 tracking-tight mt-1">Ward Duty Roster</h1>
            <p class="text-xs text-slate-500 mt-0.5">
              Manage clinical shift schedules, real-time duty rotations, and department coverage
            </p>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="button"
              @click="loadRoster"
              :disabled="loading"
              class="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 shadow-2xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <svg class="w-3.5 h-3.5 text-slate-500" :class="{ 'animate-spin': loading }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>

            <button
              type="button"
              @click="openCreateShiftModal"
              class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
              </svg>
              <span>Assign Duty Shift</span>
            </button>
          </div>
        </div>

        <!-- KPI Telemetry Grid -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div class="flex items-center justify-between text-slate-500 mb-2">
              <span class="text-[11px] font-bold uppercase tracking-wider">Total Shifts</span>
              <div class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <p class="text-2xl font-extrabold text-slate-900 font-mono">{{ rosterSummary.totalShifts }}</p>
            <p class="text-[11px] text-slate-400 mt-1">Recorded shift assignments</p>
          </div>

          <div class="bg-white border border-emerald-200/80 rounded-2xl p-5 shadow-2xs bg-emerald-50/20">
            <div class="flex items-center justify-between text-emerald-700 mb-2">
              <span class="text-[11px] font-bold uppercase tracking-wider">Currently On Duty</span>
              <div class="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
            </div>
            <p class="text-2xl font-extrabold text-emerald-900 font-mono">{{ rosterSummary.onDutyCount }}</p>
            <p class="text-[11px] text-emerald-700/80 mt-1">Active clinicians on floor</p>
          </div>

          <div class="bg-white border border-blue-200/80 rounded-2xl p-5 shadow-2xs bg-blue-50/20">
            <div class="flex items-center justify-between text-blue-700 mb-2">
              <span class="text-[11px] font-bold uppercase tracking-wider">Scheduled Coverage</span>
              <div class="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p class="text-2xl font-extrabold text-blue-900 font-mono">{{ rosterSummary.scheduledCount }}</p>
            <p class="text-[11px] text-blue-700/80 mt-1">Upcoming scheduled shifts</p>
          </div>

          <div class="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
            <div class="flex items-center justify-between text-slate-500 mb-2">
              <span class="text-[11px] font-bold uppercase tracking-wider">Completed Shifts</span>
              <div class="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p class="text-2xl font-extrabold text-slate-900 font-mono">{{ rosterSummary.completedCount }}</p>
            <p class="text-[11px] text-slate-400 mt-1">Concluded rotations</p>
          </div>
        </div>

        <!-- Toast Feedback -->
        <div
          v-if="toastMessage"
          class="p-4 rounded-2xl text-xs flex items-center justify-between border transition-all"
          :class="toastType === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'"
        >
          <div class="flex items-center gap-2.5">
            <svg v-if="toastType === 'success'" class="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else class="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span class="font-medium">{{ toastMessage }}</span>
          </div>
          <button @click="toastMessage = null" class="text-slate-400 hover:text-slate-600 cursor-pointer">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="bg-white border border-slate-200 rounded-3xl p-5 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
          <div class="relative w-full md:w-72">
            <svg class="w-4 h-4 text-slate-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              v-model="searchQuery"
              @input="onSearchInput"
              type="text"
              placeholder="Search clinician or notes..."
              class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div class="flex items-center gap-3 w-full md:w-auto justify-end flex-wrap">
            <!-- Shift Type filter -->
            <div class="flex items-center gap-2 text-xs">
              <span class="text-slate-500 font-semibold">Type:</span>
              <select
                v-model="selectedShiftType"
                @change="onFilterChange"
                class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Types</option>
                <option value="DAY">Day Shift</option>
                <option value="NIGHT">Night Shift</option>
                <option value="ON_CALL">On-Call</option>
                <option value="WEEKEND">Weekend</option>
              </select>
            </div>

            <!-- Status filter -->
            <div class="flex items-center gap-2 text-xs">
              <span class="text-slate-500 font-semibold">Status:</span>
              <select
                v-model="selectedStatus"
                @change="onFilterChange"
                class="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ON_DUTY">On Duty</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="ABSENT">Absent</option>
              </select>
            </div>

            <!-- Date filter -->
            <div class="flex items-center gap-1.5 text-xs">
              <span class="text-slate-500 font-semibold">Date:</span>
              <input
                v-model="selectedDate"
                @change="onFilterChange"
                type="date"
                class="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500"
              />
              <button
                v-if="selectedDate"
                type="button"
                @click="clearDate"
                class="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-1 rounded bg-slate-100 cursor-pointer"
                title="Clear date filter"
              >
                Clear
              </button>
              <button
                type="button"
                @click="setTodayDate"
                class="text-[11px] font-semibold text-blue-600 hover:text-blue-700 px-2 py-1 rounded bg-blue-50 cursor-pointer"
              >
                Today
              </button>
            </div>

            <!-- Per page -->
            <div class="flex items-center gap-1.5 text-xs">
              <select
                v-model="perPage"
                @change="onFilterChange"
                class="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500"
              >
                <option :value="10">10 / pg</option>
                <option :value="15">15 / pg</option>
                <option :value="30">30 / pg</option>
              </select>
            </div>

            <span class="bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-xl font-mono">
              {{ rosterPagination.total }} Shifts
            </span>
          </div>
        </div>

        <!-- Roster Table Card -->
        <div class="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          <!-- Loading state -->
          <div v-if="loading && rosterList.length === 0" class="p-12 text-center">
            <div class="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-xs text-slate-500 font-medium">Loading ward duty rosters...</p>
          </div>

          <!-- Empty state -->
          <div v-else-if="rosterList.length === 0" class="p-12 text-center space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p class="text-sm font-bold text-slate-700">No shift rosters found</p>
            <p class="text-xs text-slate-400 max-w-sm mx-auto">
              No shifts match your filter criteria. Try adjusting your date or status filters, or assign a new duty shift.
            </p>
            <div class="flex items-center justify-center gap-3 pt-1">
              <button
                type="button"
                @click="clearFilters"
                class="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
              <button
                type="button"
                @click="openCreateShiftModal"
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Assign New Shift
              </button>
            </div>
          </div>

          <!-- Table with data -->
          <div v-else class="overflow-x-auto">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th class="px-6 py-4">Clinician</th>
                  <th class="px-6 py-4">Shift Type</th>
                  <th class="px-6 py-4">Date & Hours</th>
                  <th class="px-6 py-4">Duty Status</th>
                  <th class="px-6 py-4">Clinical Notes</th>
                  <th class="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr
                  v-for="r in rosterList"
                  :key="r.id"
                  class="hover:bg-slate-50/70 transition-colors"
                >
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 font-mono shadow-inner">
                        {{ getInitials(r.staffName) }}
                      </div>
                      <div>
                        <p class="font-bold text-slate-900 text-xs">{{ r.staffName || 'Clinician' }}</p>
                        <div class="mt-0.5">
                          <RoleBadge :role="r.staffRole" />
                        </div>
                      </div>
                    </div>
                  </td>

                  <td class="px-6 py-4">
                    <span
                      class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                      :class="getShiftTypeBadgeClass(r.shiftType)"
                    >
                      <svg v-if="r.shiftType === 'DAY'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <svg v-else-if="r.shiftType === 'NIGHT'" class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      <svg v-else class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {{ formatShiftType(r.shiftType) }}
                    </span>
                  </td>

                  <td class="px-6 py-4">
                    <p class="font-bold text-slate-800 font-mono text-xs">{{ r.shiftDate }}</p>
                    <p class="text-[11px] text-slate-500 font-mono mt-0.5">{{ r.startTime }} – {{ r.endTime }}</p>
                  </td>

                  <td class="px-6 py-4">
                    <span
                      class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="getStatusBadgeClass(r.status)"
                    >
                      <span class="w-1.5 h-1.5 rounded-full" :class="getStatusDotClass(r.status)"></span>
                      {{ formatStatus(r.status) }}
                    </span>
                  </td>

                  <td class="px-6 py-4 max-w-xs truncate text-slate-600 text-xs">
                    {{ r.notes || '—' }}
                  </td>

                  <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <!-- Status Transition Dropdown -->
                      <select
                        :value="r.status"
                        @change="handleStatusChange(r, ($event.target as HTMLSelectElement).value)"
                        :disabled="actionLoadingId === r.id"
                        class="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300 focus:outline-none focus:border-blue-500 cursor-pointer disabled:opacity-50"
                      >
                        <option value="SCHEDULED">Scheduled</option>
                        <option value="ON_DUTY">On Duty</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="ABSENT">Absent</option>
                      </select>

                      <!-- Cancel Shift button -->
                      <button
                        type="button"
                        @click="handleDeleteShift(r)"
                        :disabled="actionLoadingId === r.id"
                        title="Cancel Shift"
                        class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar -->
          <div class="px-6 py-4 bg-slate-50/50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div class="text-xs text-slate-500 font-medium">
              Showing
              <span class="font-bold text-slate-800 font-mono">{{ startRecordIndex }}</span>
              to
              <span class="font-bold text-slate-800 font-mono">{{ endRecordIndex }}</span>
              of
              <span class="font-bold text-slate-800 font-mono">{{ rosterPagination.total }}</span>
              shifts
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="changePage(currentPage - 1)"
                :disabled="currentPage <= 1 || loading"
                class="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Previous</span>
              </button>

              <div class="px-3 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold font-mono">
                Page {{ currentPage }} / {{ rosterPagination.totalPages || 1 }}
              </div>

              <button
                type="button"
                @click="changePage(currentPage + 1)"
                :disabled="currentPage >= rosterPagination.totalPages || loading"
                class="px-3.5 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <span>Next</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Assign Duty Shift Modal -->
    <div
      v-if="showCreateShiftModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
    >
      <div class="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 class="text-lg font-bold text-slate-900 tracking-tight">Assign Ward Duty Shift</h3>
            <p class="text-xs text-slate-500 mt-0.5">Schedule clinician coverage and duty hours for this unit</p>
          </div>
          <button
            type="button"
            @click="showCreateShiftModal = false"
            class="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form @submit.prevent="handleCreateShiftSubmit" class="space-y-4">
          <!-- Clinician Selection -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Assigned Clinician <span class="text-red-500">*</span>
            </label>
            <select
              v-model="newShift.staffId"
              required
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            >
              <option value="" disabled>Select a ward clinician...</option>
              <option v-for="s in wardStaffList" :key="s.id" :value="s.id">
                {{ s.fullName || s.username }} ({{ s.role }})
              </option>
            </select>
          </div>

          <!-- Shift Type -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Shift Type <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="setShiftTypePreset('DAY')"
                class="px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center gap-2 cursor-pointer"
                :class="newShift.shiftType === 'DAY' ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'"
              >
                <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                <span>Day (08:00-20:00)</span>
              </button>
              <button
                type="button"
                @click="setShiftTypePreset('NIGHT')"
                class="px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center gap-2 cursor-pointer"
                :class="newShift.shiftType === 'NIGHT' ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'"
              >
                <span class="w-2 h-2 rounded-full bg-purple-500"></span>
                <span>Night (20:00-08:00)</span>
              </button>
              <button
                type="button"
                @click="setShiftTypePreset('ON_CALL')"
                class="px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center gap-2 cursor-pointer"
                :class="newShift.shiftType === 'ON_CALL' ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'"
              >
                <span class="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>On-Call Coverage</span>
              </button>
              <button
                type="button"
                @click="setShiftTypePreset('WEEKEND')"
                class="px-3 py-2 rounded-xl text-xs font-semibold border transition-all text-left flex items-center gap-2 cursor-pointer"
                :class="newShift.shiftType === 'WEEKEND' ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-200 text-slate-700'"
              >
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Weekend Shift</span>
              </button>
            </div>
          </div>

          <!-- Shift Date -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Shift Date <span class="text-red-500">*</span>
            </label>
            <input
              v-model="newShift.shiftDate"
              type="date"
              required
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <!-- Time Range -->
          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">Start Time</label>
              <input
                v-model="newShift.startTime"
                type="time"
                required
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div class="space-y-1.5">
              <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">End Time</label>
              <input
                v-model="newShift.endTime"
                type="time"
                required
                class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <!-- Clinical Notes -->
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Special Coverage Notes / Responsibilities
            </label>
            <input
              v-model="newShift.notes"
              type="text"
              placeholder="e.g. Lead Inpatient Ward Rounds, Telemetry Surveillance..."
              class="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <!-- Form Actions -->
          <div class="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              @click="showCreateShiftModal = false"
              class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              :disabled="submitLoading"
              class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <span v-if="submitLoading" class="animate-pulse">Assigning...</span>
              <span v-else>Assign Duty Shift</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Ward Switcher Modal -->
    <WardSwitcherModal :isOpen="showWardSwitcher" @close="showWardSwitcher = false" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '~/components/AppSidebar.vue'
import AppNavbar from '~/components/AppNavbar.vue'
import WardSwitcherModal from '~/components/WardSwitcherModal.vue'
import RoleBadge from '~/components/RoleBadge.vue'
import { useUnit, type UnitRosterItem, type UnitStaffMember } from '~/composables/useUnit'

const unit = useUnit()
const route = useRoute()

const showWardSwitcher = ref(false)
const showCreateShiftModal = ref(false)

const loading = computed(() => unit.loading.value)
const rosterList = computed(() => unit.rosters.value)
const rosterPagination = computed(() => unit.rosterPagination.value)
const rosterSummary = computed(() => unit.rosterSummary.value)

const searchQuery = ref('')
const selectedShiftType = ref('ALL')
const selectedStatus = ref('ALL')
const selectedDate = ref('')
const perPage = ref(15)
const currentPage = ref(1)

const wardStaffList = ref<UnitStaffMember[]>([])
const actionLoadingId = ref<string | null>(null)
const submitLoading = ref(false)

const toastMessage = ref<string | null>(null)
const toastType = ref<'success' | 'error'>('success')

let searchTimeout: any = null

const todayStr = new Date().toISOString().slice(0, 10)

const newShift = ref({
  staffId: '',
  shiftType: 'DAY',
  shiftDate: todayStr,
  startTime: '08:00',
  endTime: '20:00',
  notes: '',
})

const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
  toastMessage.value = msg
  toastType.value = type
  setTimeout(() => {
    if (toastMessage.value === msg) {
      toastMessage.value = null
    }
  }, 4500)
}

const getInitials = (name?: string) => {
  if (!name) return 'CL'
  const parts = name.split(' ')
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const formatShiftType = (type: string) => {
  switch (type) {
    case 'DAY': return 'Day Shift'
    case 'NIGHT': return 'Night Shift'
    case 'ON_CALL': return 'On-Call'
    case 'WEEKEND': return 'Weekend'
    default: return type
  }
}

const getShiftTypeBadgeClass = (type: string) => {
  switch (type) {
    case 'DAY': return 'bg-amber-50 text-amber-800 border border-amber-200/80'
    case 'NIGHT': return 'bg-purple-50 text-purple-800 border border-purple-200/80'
    case 'ON_CALL': return 'bg-blue-50 text-blue-800 border border-blue-200/80'
    case 'WEEKEND': return 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
    default: return 'bg-slate-100 text-slate-700 border border-slate-200'
  }
}

const formatStatus = (status: string) => {
  switch (status) {
    case 'ON_DUTY': return 'On Duty'
    case 'SCHEDULED': return 'Scheduled'
    case 'COMPLETED': return 'Completed'
    case 'ABSENT': return 'Absent'
    default: return status
  }
}

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'ON_DUTY': return 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
    case 'SCHEDULED': return 'bg-blue-50 text-blue-700 border border-blue-200/60'
    case 'COMPLETED': return 'bg-slate-100 text-slate-600 border border-slate-200'
    case 'ABSENT': return 'bg-red-50 text-red-700 border border-red-200/60'
    default: return 'bg-slate-100 text-slate-700'
  }
}

const getStatusDotClass = (status: string) => {
  switch (status) {
    case 'ON_DUTY': return 'bg-emerald-500'
    case 'SCHEDULED': return 'bg-blue-500'
    case 'COMPLETED': return 'bg-slate-400'
    case 'ABSENT': return 'bg-red-500'
    default: return 'bg-slate-400'
  }
}

const startRecordIndex = computed(() => {
  if (rosterPagination.value.total === 0) return 0
  return (currentPage.value - 1) * perPage.value + 1
})

const endRecordIndex = computed(() => {
  return Math.min(currentPage.value * perPage.value, rosterPagination.value.total)
})

const loadRoster = async () => {
  try {
    await unit.fetchRoster({
      page: currentPage.value,
      limit: perPage.value,
      shiftType: selectedShiftType.value,
      status: selectedStatus.value,
      date: selectedDate.value,
      search: searchQuery.value,
    })
  } catch (err: any) {
    showToast(err.message || 'Failed to load shift rosters', 'error')
  }
}

const onSearchInput = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    loadRoster()
  }, 350)
}

const onFilterChange = () => {
  currentPage.value = 1
  loadRoster()
}

const clearDate = () => {
  selectedDate.value = ''
  currentPage.value = 1
  loadRoster()
}

const setTodayDate = () => {
  selectedDate.value = todayStr
  currentPage.value = 1
  loadRoster()
}

const clearFilters = () => {
  searchQuery.value = ''
  selectedShiftType.value = 'ALL'
  selectedStatus.value = 'ALL'
  selectedDate.value = ''
  currentPage.value = 1
  loadRoster()
}

const changePage = (newPage: number) => {
  if (newPage < 1 || newPage > rosterPagination.value.totalPages) return
  currentPage.value = newPage
  loadRoster()
}

const handleStatusChange = async (r: UnitRosterItem, newStatus: any) => {
  actionLoadingId.value = r.id
  try {
    await unit.updateRosterStatus(r.id, newStatus)
    showToast(`Shift status for "${r.staffName}" updated to ${formatStatus(newStatus)}.`, 'success')
  } catch (err: any) {
    showToast(err.message || 'Failed to update shift status', 'error')
  } finally {
    actionLoadingId.value = null
  }
}

const handleDeleteShift = async (r: UnitRosterItem) => {
  if (!confirm(`Are you sure you want to cancel shift assignment for "${r.staffName}" on ${r.shiftDate}?`)) {
    return
  }
  actionLoadingId.value = r.id
  try {
    await unit.deleteRosterShift(r.id)
    showToast(`Shift assignment for "${r.staffName}" cancelled successfully.`, 'success')
    await loadRoster()
  } catch (err: any) {
    showToast(err.message || 'Failed to cancel shift assignment', 'error')
  } finally {
    actionLoadingId.value = null
  }
}

const setShiftTypePreset = (type: 'DAY' | 'NIGHT' | 'ON_CALL' | 'WEEKEND') => {
  newShift.value.shiftType = type
  if (type === 'DAY') {
    newShift.value.startTime = '08:00'
    newShift.value.endTime = '20:00'
  } else if (type === 'NIGHT') {
    newShift.value.startTime = '20:00'
    newShift.value.endTime = '08:00'
  } else if (type === 'ON_CALL') {
    newShift.value.startTime = '09:00'
    newShift.value.endTime = '17:00'
  } else if (type === 'WEEKEND') {
    newShift.value.startTime = '08:00'
    newShift.value.endTime = '18:00'
  }
}

const openCreateShiftModal = async () => {
  showCreateShiftModal.value = true
  if (wardStaffList.value.length === 0) {
    try {
      const res = await unit.fetchStaff({ limit: 100 })
      wardStaffList.value = res.staff
      if (res.staff.length > 0 && !newShift.value.staffId) {
        newShift.value.staffId = res.staff[0].id
      }
    } catch {
      // Ignored
    }
  }
}

const handleCreateShiftSubmit = async () => {
  if (!newShift.value.staffId) {
    showToast('Please select a staff member', 'error')
    return
  }
  submitLoading.value = true
  try {
    await unit.createRosterShift({
      staffId: newShift.value.staffId,
      shiftType: newShift.value.shiftType,
      shiftDate: newShift.value.shiftDate,
      startTime: newShift.value.startTime,
      endTime: newShift.value.endTime,
      notes: newShift.value.notes,
    })
    showToast('Duty shift assigned successfully.', 'success')
    showCreateShiftModal.value = false
    newShift.value.notes = ''
    await loadRoster()
  } catch (err: any) {
    showToast(err.message || 'Failed to assign duty shift', 'error')
  } finally {
    submitLoading.value = false
  }
}

onMounted(() => {
  if (route.query.search) {
    searchQuery.value = String(route.query.search)
  }
  loadRoster()
})
</script>
