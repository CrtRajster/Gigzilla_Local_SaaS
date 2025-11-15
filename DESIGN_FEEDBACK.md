# Gigzilla Desktop App - Design Feedback

**Date:** 2025-11-15
**Status:** CRITICAL DESIGN ISSUES

---

## 🚨 CRITICAL ISSUES

### 1. **First Window Visual Design - COMPLETELY UNACCEPTABLE**

**Problem:**
- Current design looks CHEAP and GENERIC
- Feels like early 2010s design - completely soulless
- Not modern at all
- Does not match brand expectations

**Required Changes:**
- Visual design should be closer to **gigzilla.site** web design
- Should have **modern liquid glass** aesthetic
- Clean, premium, modern feel
- Professional polish expected in 2025

---

### 2. **Pricing Display Before Login - HORRENDOUS UX**

**Problem:**
- Showing pricing BEFORE user even logs in is terrible UX
- Creates friction and overcrowded interface
- Not clean or minimalist

**Required Changes:**
- **NEVER** show pricing before login/activation
- Design should be clean and minimalist
- Remove pricing from activation screen entirely

---

### 3. **Gigzilla Pro Lifetime Visibility - MAJOR ERROR**

**Problem:**
- "Gigzilla Pro Lifetime" tier is visible in the app
- This is supposed to be a HIDDEN feature

**Required Changes:**
- **Gigzilla Pro Lifetime should NEVER be visible anywhere in the public app**
- This tier is EXCLUSIVELY for AppSumo integration
- Only accessible via backend API, not UI

---

### 4. **Public Pricing Tiers - Only 2 Options**

**Correct Public Pricing:**
- ✅ **€9/month** (Monthly)
- ✅ **€90/year** (Annual)

**Hidden/Private:**
- ❌ **€360 Lifetime** (AppSumo ONLY - never shown in UI)

---

### 5. **Window Proportions - Poor Layout**

**Problem:**
- Static window with bad proportions for login page
- Window size doesn't match content purpose

**Required Changes:**
- Window should be **dynamic/resizable**
- OR if static: have better proportions optimized for login page
- Current window size feels awkward and poorly sized

---

## 🎯 DESIGN REQUIREMENTS

### Visual Style:
- Modern liquid glass aesthetic
- Similar to gigzilla.site
- Clean and minimalist
- Premium feel
- 2025-level polish

### UX Flow:
1. Clean activation screen (no pricing)
2. User activates/logs in
3. THEN show upgrade options (if on trial)
4. Only 2 public tiers visible: Monthly/Annual

### Pricing Display Rules:
- Show pricing ONLY after user is logged in
- Show pricing ONLY in dedicated "Upgrade" view
- NEVER show Lifetime tier in UI
- Keep activation screen minimal and clean

---

## 📋 ACTION ITEMS

- [ ] Redesign activation screen (modern liquid glass)
- [ ] Remove ALL pricing from activation flow
- [ ] Hide Lifetime tier completely from UI
- [ ] Update upgrade view to only show 2 tiers
- [ ] Match visual style to gigzilla.site
- [ ] Remove early 2010s generic look
- [ ] Add premium polish and modern aesthetics

---

## NOTES

The current design is giving "generic Electron template" vibes. This needs to feel like a premium, modern SaaS product that users would be proud to use. Think Notion, Linear, Arc Browser level of polish - not old desktop software.
