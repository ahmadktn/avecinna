<template>
  <aside
    class="fixed inset-y-0 left-0 w-64 bg-slate-950 text-white h-screen flex flex-col justify-between z-50 lg:z-30 border-r border-slate-900/80 select-none transition-transform duration-300 ease-in-out"
    :class="isMobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'"
  >
    <div class="flex flex-col min-h-0 flex-1">
      <!-- Brand Header -->
      <div class="px-5 py-4 sm:py-5 flex items-center justify-between border-b border-slate-900/80">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0 p-1">
            <img src="/avecinna icon.png" alt="Avecinna" class="w-full h-full object-contain" />
          </div>
          <div class="min-w-0">
            <span class="font-brand text-base font-semibold tracking-tight text-white block leading-none">Avecinna</span>
            <span class="text-[10px] text-slate-500 font-mono tracking-wider uppercase mt-0.5 block truncate">Context-Aware EMR</span>
          </div>
        </div>

        <!-- Mobile Close Button -->
        <button
          type="button"
          @click="$emit('close')"
          class="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer shrink-0"
          aria-label="Close navigation sidebar"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation Links -->
      <nav class="px-3 py-3 space-y-0.5 overflow-y-auto flex-1">

        <!-- Clinician Menu (Doctor) -->
        <template v-if="role === 'DOCTOR'">
          <NuxtLink
            to="/doctor"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/doctor') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Clinical Overview</span>
          </NuxtLink>

          <NuxtLink
            to="/patients"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/patients') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>My Patients</span>
          </NuxtLink>

          <NuxtLink
            to="/doctor/consultations"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/doctor/consultations') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Consultations</span>
          </NuxtLink>

          <NuxtLink
            to="/doctor/encounter"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/doctor/encounter') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>New Encounter</span>
          </NuxtLink>

          <NuxtLink
            to="/doctor/profile"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/doctor/profile') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>My Profile</span>
          </NuxtLink>
        </template>

        <!-- Nurse / Paramedic Menu -->
        <template v-else-if="role === 'NURSE' || role === 'PARAMEDIC'">
          <NuxtLink
            to="/nurse"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/nurse') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Nursing Station</span>
          </NuxtLink>

          <NuxtLink
            to="/patients"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/patients') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Ward & Care Team</span>
          </NuxtLink>

          <NuxtLink
            to="/nurse/profile"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/nurse/profile') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>My Profile</span>
          </NuxtLink>
        </template>

        <!-- Clerk Menu -->
        <template v-else-if="role === 'CLERK'">
          <NuxtLink
            to="/clerk"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/clerk') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Overview</span>
          </NuxtLink>

          <NuxtLink
            to="/clerk/patients"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/clerk/patients') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Patients</span>
          </NuxtLink>

          <NuxtLink
            to="/clerk/register"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/clerk/register') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span>Registration</span>
          </NuxtLink>

          <NuxtLink
            to="/clerk/appointments"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/clerk/appointments') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Appointments</span>
          </NuxtLink>

          <NuxtLink
            to="/clerk/admissions"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/clerk/admissions') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Bed Allocation</span>
          </NuxtLink>

          <NuxtLink
            to="/clerk/profile"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/clerk/profile') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>My Profile</span>
          </NuxtLink>
        </template>

        <!-- Pharmacist Menu -->
        <template v-else-if="role === 'PHARMACIST'">
          <NuxtLink
            to="/pharmacy/prescriptions"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/pharmacy/prescriptions') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L5.605 15.12a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <span>Prescription Queue</span>
          </NuxtLink>
        </template>

        <!-- Head of Unit Menu -->
        <template v-else-if="role === 'HEAD_OF_UNIT'">
          <div class="px-3 pt-2 pb-1 text-[10px] font-medium tracking-widest uppercase text-slate-500">
            Unit Leadership
          </div>

          <NuxtLink
            to="/unit"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/unit') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>Unit Overview</span>
          </NuxtLink>

          <NuxtLink
            to="/unit/staff"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/unit/staff') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Staff Directory</span>
          </NuxtLink>

          <NuxtLink
            to="/unit/roster"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/unit/roster') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Duty Roster</span>
          </NuxtLink>

          <div class="px-3 pt-4 pb-1 text-[10px] font-medium tracking-widest uppercase text-slate-500">
            Clinical Practice
          </div>

          <NuxtLink
            to="/doctor"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/doctor') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Clinical Overview</span>
          </NuxtLink>

          <NuxtLink
            to="/patients"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/patients') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span>Ward Patients</span>
          </NuxtLink>

          <NuxtLink
            to="/doctor/consultations"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/doctor/consultations') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Consultations</span>
          </NuxtLink>

          <NuxtLink
            to="/doctor/encounter"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/doctor/encounter') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>New Encounter</span>
          </NuxtLink>

          <NuxtLink
            to="/doctor/profile"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/doctor/profile') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>My Profile</span>
          </NuxtLink>
        </template>

        <!-- System Admin Menu -->
        <template v-else-if="role === 'ADMIN'">
          <NuxtLink
            to="/admin/dashboard"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/admin/dashboard') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span>System Overview</span>
          </NuxtLink>

          <NuxtLink
            to="/admin/users"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/admin/users') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>Staff Management</span>
          </NuxtLink>

          <NuxtLink
            to="/admin/wards"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/admin/wards') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>Hospital Wards</span>
          </NuxtLink>

          <NuxtLink
            to="/admin/patients"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/admin/patients') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Patients Directory</span>
          </NuxtLink>

          <NuxtLink
            to="/admin/audit"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/admin/audit') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Audit Ledger</span>
          </NuxtLink>

          <NuxtLink
            to="/admin/reports"
            class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all"
            :class="isRouteActive('/admin/reports') ? activeClass : inactiveClass"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Reports</span>
          </NuxtLink>
        </template>
      </nav>
    </div>

    <!-- User Profile Footer -->
    <div class="px-4 py-4 border-t border-slate-900/80 space-y-3 bg-slate-950 shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-xs font-semibold text-white shrink-0 font-mono">
          {{ initials }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-white truncate leading-snug">{{ user?.fullName || user?.username || 'Staff User' }}</p>
          <div class="mt-0.5">
            <RoleBadge :role="role" />
          </div>
        </div>
      </div>

      <button
        type="button"
        @click="logout"
        class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors cursor-pointer"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
        <span>Sign out</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuth } from '~/composables/useAuth'

defineProps<{
  isMobileOpen?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const auth = useAuth()
const route = useRoute()

// Auto-close sidebar on route change on mobile devices
watch(
  () => route.path,
  () => {
    emit('close')
  }
)

const user = computed(() => auth.user.value)
const role = computed(() => auth.role.value)

// Active state: subtle slate-800 bg + blue left accent
const activeClass = 'bg-slate-800 text-white border-l-2 border-blue-500 pl-[10px]'
// Inactive: muted text, understated hover
const inactiveClass = 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'

const initials = computed(() => {
  const name = user.value?.fullName || user.value?.username || 'SU'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
})

const isRouteActive = (path: string) => {
  if (path === '/doctor' || path === '/clerk' || path === '/admin/dashboard' || path === '/patients' || path === '/pharmacy/prescriptions' || path === '/unit' || path === '/nurse') {
    return route.path === path || route.path === `${path}/`
  }
  return route.path === path || route.path.startsWith(path + '/')
}

const logout = () => {
  auth.logout()
}
</script>
