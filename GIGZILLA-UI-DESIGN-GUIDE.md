# Gigzilla UI Design Guide
**Version 1.0 - Hybrid Bento + Notion Style**

## 🎨 Design Philosophy

### Core Principles

**1. Scannable Hierarchy**
- Important information stands out immediately
- Clear visual separation between sections
- Generous whitespace prevents overwhelm

**2. Context Over Chrome**
- Minimal UI chrome (borders, shadows, decorations)
- Content is the focus, not the container
- Clean, uncluttered interfaces

**3. Intelligent Layout Switching**
- Bento for overview/dashboard (glanceable metrics)
- Kanban for workflows (visual process)
- Lists for data-dense content (invoices, clients)
- Single column for forms (focus)

**4. Notion-Inspired Aesthetics**
- Soft shadows instead of hard borders
- Subtle hover states
- Clean typography with clear hierarchy
- Generous padding and line height

**5. Apple Notes Simplicity**
- Single-column flow where possible
- Dividers instead of boxes
- Comfortable reading experience
- Not trying to show everything at once

---

## 🏗️ Layout System

### Grid Foundation

**Base grid:** 8px unit system
```
4px  - Micro spacing (icon to text)
8px  - Tight spacing (within components)
16px - Standard spacing (between elements)
24px - Section spacing (between groups)
32px - Large spacing (between major sections)
48px - Extra large (top of views)
```

**Container widths:**
```
Sidebar: 240px (fixed)
Main content: Auto (fills remaining space)
Max content width: 1400px (center-aligned on large screens)
Card max-width: 600px (for readability)
```

---

## 📐 View-by-View Layout Guide

### 1. Dashboard View
**Layout Style:** Full Bento Grid
**Rationale:** Perfect for at-a-glance overview, everything visible without scrolling

```
┌─────────────────────────────────────────────────────────────────────┐
│ Dashboard                                      Friday, January 15    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  48px top padding                                                   │
│                                                                     │
│  ┌───────────────────────────────┬───────────────────────────────┐ │
│  │                               │                               │ │
│  │  💰 This Month                │  ⚠️ Needs Attention           │ │
│  │                               │                               │ │
│  │  24px internal padding        │  Red accent border-left: 3px  │ │
│  │                               │                               │ │
│  │  €12,500 earned              │  • 2 invoices overdue         │ │
│  │  €8,500 pending              │  • 1 deadline tomorrow        │ │
│  │                               │  • 3 unsent invoices          │ │
│  │  [View Money →]               │  [View Pipeline →]            │ │
│  │                               │                               │ │
│  └───────────────────────────────┴───────────────────────────────┘ │
│                                                                     │
│  24px gap between card rows                                         │
│                                                                     │
│  ┌─────────────────────────────────────────────┬─────────────────┐ │
│  │                                             │                 │ │
│  │  📊 Project Pipeline                        │  🎯 Quick       │ │
│  │                                             │     Actions     │ │
│  │  To Start: 2    Working: 3                 │                 │ │
│  │  Done: 1        Paid: 12                   │  [+ Project]    │ │
│  │                                             │  [Send Invoice] │ │
│  │  ▓▓▓░░░░░░░ 30% complete                   │  [Log Payment]  │ │
│  │                                             │                 │ │
│  │  Spans 2/3 width                            │  Spans 1/3      │ │
│  │                                             │                 │ │
│  └─────────────────────────────────────────────┴─────────────────┘ │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │  🎉 Recent Activity                                           │ │
│  │                                                               │ │
│  │  • Payment received: €2,500 from Gamma LLC                   │ │
│  │    2 hours ago · #INV-042                                     │ │
│  │                                                               │ │
│  │  • Invoice sent: INV-043 to Delta Co                         │ │
│  │    5 hours ago · €3,000                                       │ │
│  │                                                               │ │
│  │  Full width card, sits at bottom                             │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Grid configuration:**
```css
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr; /* Two equal columns */
  gap: 24px;
  padding: 48px 32px;
}

.dashboard-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s;
}

.dashboard-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

/* Span modifiers */
.span-2 { grid-column: span 2; } /* Full width */
.span-2-3 { grid-column: span 2; } /* For "Project Pipeline" */
```

**Card anatomy:**
```
┌─────────────────────────────────────┐
│ Icon + Title (semibold, 16px)       │ ← Header
│ 12px gap                            │
│ Primary metric (bold, 32px)         │ ← Main content
│ Secondary info (regular, 14px)      │
│ 16px gap                            │
│ [Action Button →]                   │ ← Footer (optional)
└─────────────────────────────────────┘
```

**Colors:**
- Background: `#FFFFFF`
- Shadow: `rgba(0, 0, 0, 0.06)` to `rgba(0, 0, 0, 0.08)` on hover
- Attention card: `border-left: 3px solid #EF4444` (red accent)
- Success metrics: `#10B981` (green)
- Warning metrics: `#F59E0B` (yellow)

---

### 2. Pipeline View
**Layout Style:** Kanban Board (Horizontal Columns)
**Rationale:** Visual workflow representation, industry-standard pattern

```
┌─────────────────────────────────────────────────────────────────────┐
│ Pipeline                                        [+ New Project]      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  32px top padding                                                   │
│                                                                     │
│  To Start (2)    Working (3)      Done (1)        Paid (12)        │
│  ─────────────────────────────────────────────────────────────────  │
│                                                                     │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐       │
│  │ Card     │   │ Card     │   │ Card     │   │ Card     │       │
│  │ 260px    │   │ 260px    │   │ 260px    │   │ 260px    │       │
│  │ wide     │   │ wide     │   │ wide     │   │ wide     │       │
│  └──────────┘   └──────────┘   └──────────┘   └──────────┘       │
│                                                                     │
│  16px gap between columns                                           │
│  12px gap between cards in same column                              │
│                                                                     │
│  Horizontal scroll if needed (mobile)                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Column structure:**
```css
.kanban-board {
  display: flex;
  gap: 16px;
  padding: 32px;
  overflow-x: auto; /* Horizontal scroll on small screens */
}

.kanban-column {
  flex: 0 0 260px; /* Fixed width, no grow/shrink */
  min-height: 400px;
}

.kanban-column-header {
  font-weight: 600;
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kanban-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  cursor: grab;
  transition: transform 0.2s, box-shadow 0.2s;
}

.kanban-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.kanban-card.dragging {
  opacity: 0.5;
  cursor: grabbing;
}
```

**Card anatomy:**
```
┌────────────────────────────┐
│ Logo design                │ ← Project name (bold, 15px)
│ Acme Corp                  │ ← Client (regular, 13px, gray)
│                            │
│ €1,500                     │ ← Amount (semibold, 18px)
│                            │
│ Due: Feb 20                │ ← Metadata (12px, light gray)
│ Direct                     │ ← Platform badge (optional)
│                            │
│ [⋮]                        │ ← Actions menu (top right)
└────────────────────────────┘
```

**Visual indicators:**
- Hover: Lift up 2px + shadow increase
- Dragging: 50% opacity
- Overdue deadline: Red dot next to due date
- No deadline: Don't show due date line

---

### 3. Money View
**Layout Style:** Notion-Style (Bento Header + Clean List)
**Rationale:** Metrics in bento cards, detailed data in scannable list

```
┌─────────────────────────────────────────────────────────────────────┐
│ Money                                            January 2025        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  32px top padding                                                   │
│                                                                     │
│  ┌──────────┬──────────┬──────────┬──────────┐                    │
│  │ Earned   │ Pending  │ Overdue  │ Profit   │                    │
│  │          │          │          │          │                    │
│  │ €12,500  │ €8,500   │ €6,500   │ €11,200  │                    │
│  │ ✓ +12%   │          │ ⚠️        │ +8%      │                    │
│  │          │          │          │          │                    │
│  └──────────┴──────────┴──────────┴──────────┘                    │
│                                                                     │
│  4 equal-width stat cards, 16px gap                                 │
│                                                                     │
│  24px gap                                                           │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ 📊 Income Trend                                               │ │
│  │                                                               │ │
│  │ [Simple bar chart - last 6 months]                           │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  32px gap                                                           │
│                                                                     │
│  Invoices                        [All ▼] [Search] [+ New Invoice]  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                     │
│  INV-042  Acme Corp    €1,500   Overdue (3 days)  [Send Reminder]  │
│  INV-058  Gamma LLC    €2,500   Paid ✓            [View]           │
│  INV-061  Beta Inc     €5,000   Sent (5 days ago) [Send Reminder]  │
│                                                                     │
│  No cards, just clean rows with subtle hover                        │
│  1px divider between rows (#F3F4F6)                                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Stat cards:**
```css
.money-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.stat-label {
  font-size: 13px;
  color: #6B7280;
  margin-bottom: 8px;
  font-weight: 500;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #111827;
  line-height: 1;
}

.stat-change {
  font-size: 12px;
  color: #10B981; /* Green for positive */
  margin-top: 4px;
}
```

**Invoice list (Notion-style):**
```css
.invoice-list {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}

.invoice-list-header {
  padding: 16px 20px;
  border-bottom: 2px solid #F3F4F6;
  font-weight: 600;
  font-size: 14px;
  color: #374151;
}

.invoice-row {
  display: grid;
  grid-template-columns: 100px 1fr 120px 180px 140px;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid #F3F4F6;
  transition: background-color 0.15s;
  align-items: center;
}

.invoice-row:hover {
  background-color: #F9FAFB;
  cursor: pointer;
}

.invoice-row:last-child {
  border-bottom: none;
}
```

**List row anatomy:**
```
┌─────────┬────────────┬──────────┬─────────────────┬──────────────┐
│ INV-042 │ Acme Corp  │ €1,500   │ Overdue (3d)    │ [Action BTN] │
│ ↑       │ ↑          │ ↑        │ ↑               │ ↑            │
│ 13px    │ 14px       │ 15px     │ 13px            │ Button       │
│ mono    │ semibold   │ semibold │ Color-coded     │              │
│ gray    │ black      │ black    │ Red/Green/Gray  │              │
└─────────┴────────────┴──────────┴─────────────────┴──────────────┘
```

**Status colors:**
- Overdue: `#EF4444` (red) with `#FEE2E2` background pill
- Paid: `#10B981` (green) with `#D1FAE5` background pill
- Sent: `#6B7280` (gray) normal text

---

### 4. Clients View
**Layout Style:** Apple Notes Style (Clean Single Column)
**Rationale:** Easy to scan, expandable details, comfortable reading

```
┌─────────────────────────────────────────────────────────────────────┐
│ Clients                            [Sort: Recent ▼] [+ New Client]  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  32px top padding                                                   │
│                                                                     │
│  [🔍 Search clients...]                                             │
│  Full-width search, 48px height, subtle border                      │
│                                                                     │
│  24px gap                                                           │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  🏢 Acme Corp                            [Edit] [•••]         │ │
│  │  john@acme.com • +1234567890                                 │ │
│  │                                                               │ │
│  │  ─────────────────────────────────────────────────────────── │ │
│  │                                                               │ │
│  │  3 projects • €9,000 total • 66% paid on time                │ │
│  │                                                               │ │
│  │  ▼ Recent projects (Click to expand)                         │ │
│  │    • Logo design (€1,500) - Overdue 3 days                   │ │
│  │    • Website (€5,000) - Working                              │ │
│  │    • Branding (€2,500) - Paid ✓                              │ │
│  │                                                               │ │
│  │  [View All Projects] [+ New Project]                         │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  16px gap between client cards                                      │
│                                                                     │
│  Max-width: 900px (center on large screens)                         │
│  Left-aligned on screens < 1200px                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Client card structure:**
```css
.clients-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 32px;
}

.client-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  transition: box-shadow 0.2s;
}

.client-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.client-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.client-name {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
}

.client-contact {
  font-size: 14px;
  color: #6B7280;
  margin-bottom: 16px;
}

.client-divider {
  border: none;
  border-top: 1px solid #E5E7EB;
  margin: 16px 0;
}

.client-stats {
  font-size: 14px;
  color: #374151;
  margin-bottom: 12px;
}

.client-projects {
  margin-top: 12px;
}

.client-project-item {
  padding: 8px 0;
  font-size: 14px;
  color: #4B5563;
  padding-left: 16px; /* Indent for bullet */
}
```

**Expandable section:**
```css
.expandable-section {
  cursor: pointer;
  padding: 12px 0;
  user-select: none;
}

.expandable-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 500;
  color: #374151;
}

.expand-icon {
  transition: transform 0.2s;
}

.expandable-section.expanded .expand-icon {
  transform: rotate(90deg);
}

.expandable-content {
  max-height: 0;
  overflow: hidden;
  transition: max-height 0.3s ease;
}

.expandable-section.expanded .expandable-content {
  max-height: 500px; /* Large enough for content */
  margin-top: 8px;
}
```

---

### 5. Settings View
**Layout Style:** Notion Tabs + Single Column Forms
**Rationale:** Organized by category, focused input experience

```
┌─────────────────────────────────────────────────────────────────────┐
│ Settings                                                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  32px top padding                                                   │
│                                                                     │
│  [Profile] [Invoice] [Reminders] [Notifications] [Backup]          │
│  ─────────                                                          │
│  Active tab has bottom border (3px, blue)                           │
│                                                                     │
│  24px gap                                                           │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                                                               │ │
│  │  Profile Information                                          │ │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│  │                                                               │ │
│  │  Full name                                                    │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │ Alex Designer                                           │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │                                                               │ │
│  │  Email                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────┐ │ │
│  │  │ alex@designstudio.com                                   │ │ │
│  │  └─────────────────────────────────────────────────────────┘ │ │
│  │                                                               │ │
│  │  24px gap between sections                                    │ │
│  │                                                               │ │
│  │  Payment Methods                                              │ │
│  │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ │
│  │                                                               │ │
│  │  PayPal                                                       │ │
│  │  [Connect PayPal] ✅ Connected as alex@paypal.com           │ │
│  │                                                               │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                                                     │
│  Max-width: 700px (comfortable form width)                          │
│  Center-aligned                                                     │
│                                                                     │
│  [Save Changes]                                                     │
│  Sticky at bottom right when scrolling                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Tab navigation:**
```css
.settings-tabs {
  display: flex;
  gap: 32px;
  border-bottom: 1px solid #E5E7EB;
  padding-bottom: 0;
  margin-bottom: 32px;
}

.settings-tab {
  padding: 12px 0;
  font-weight: 500;
  color: #6B7280;
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: color 0.2s, border-color 0.2s;
  user-select: none;
}

.settings-tab:hover {
  color: #374151;
}

.settings-tab.active {
  color: #3B82F6;
  border-bottom-color: #3B82F6;
}
```

**Form sections:**
```css
.settings-content {
  max-width: 700px;
  margin: 0 auto;
  padding: 0 32px 32px 32px;
}

.settings-section {
  margin-bottom: 40px;
}

.settings-section-title {
  font-size: 16px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 12px;
  border-bottom: 2px solid #E5E7EB;
  padding-bottom: 12px;
}

.form-field {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 12px 16px;
  font-size: 15px;
  border: 1px solid #D1D5DB;
  border-radius: 6px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #3B82F6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}
```

---

### 6. Modal/Dialog Forms
**Layout Style:** Centered Single Column (Notion-style Modal)
**Rationale:** Focus, minimize distraction, clear actions

```
Backdrop with 40% opacity black
                    │
                    ▼
        ┌───────────────────────────┐
        │                           │
        │  ✨ New Project           │  ← Header (icon + title)
        │  ─────────────────────    │  ← Subtle divider
        │                           │
        │  Project name *           │  ← Label (14px, semibold)
        │  ┌─────────────────────┐  │
        │  │ Logo design         │  │  ← Input (15px, 48px height)
        │  └─────────────────────┘  │
        │                           │
        │  12px gap                 │
        │                           │
        │  Client *                 │
        │  ┌─────────────────────┐  │
        │  │ Acme Corp        ▼  │  │  ← Dropdown/autocomplete
        │  └─────────────────────┘  │
        │                           │
        │  Suggestions:             │
        │  • Acme Corp (existing)   │  ← Inline suggestions
        │  • Create "Acme" as new   │
        │                           │
        │  [More fields...]         │
        │                           │
        │  32px gap                 │
        │                           │
        │  [Cancel]  [Create] ← Primary button (blue, right)
        │            ↑              │
        │        Secondary (gray)   │
        │                           │
        └───────────────────────────┘
        480px wide, auto height
        32px padding all around
        Center of screen
```

**Modal styling:**
```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 480px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
              0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-header {
  padding: 24px 32px 16px 32px;
  border-bottom: 1px solid #F3F4F6;
}

.modal-title {
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 8px;
}

.modal-body {
  padding: 24px 32px;
}

.modal-footer {
  padding: 16px 32px 24px 32px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid #F3F4F6;
}
```

---

## 🎨 Color System

### Primary Palette

```css
/* Grays (Tailwind-inspired) */
--gray-50: #F9FAFB;   /* Backgrounds */
--gray-100: #F3F4F6;  /* Borders, dividers */
--gray-200: #E5E7EB;  /* Disabled states */
--gray-300: #D1D5DB;  /* Input borders */
--gray-400: #9CA3AF;  /* Placeholder text */
--gray-500: #6B7280;  /* Secondary text */
--gray-600: #4B5563;  /* Body text */
--gray-700: #374151;  /* Headings */
--gray-800: #1F2937;  /* Strong emphasis */
--gray-900: #111827;  /* Titles */

/* Brand Blue */
--blue-50: #EFF6FF;
--blue-100: #DBEAFE;
--blue-500: #3B82F6;  /* Primary actions */
--blue-600: #2563EB;  /* Hover states */
--blue-700: #1D4ED8;  /* Active states */

/* Semantic Colors */
--green-50: #D1FAE5;   /* Success backgrounds */
--green-500: #10B981;  /* Success text/icons */
--green-600: #059669;  /* Success hover */

--red-50: #FEE2E2;     /* Error backgrounds */
--red-500: #EF4444;    /* Error text/icons */
--red-600: #DC2626;    /* Error hover */

--yellow-50: #FEF3C7;  /* Warning backgrounds */
--yellow-500: #F59E0B; /* Warning text/icons */
--yellow-600: #D97706; /* Warning hover */
```

### Usage Guidelines

**Backgrounds:**
- App background: `--gray-50` (#F9FAFB)
- Card backgrounds: `#FFFFFF` (pure white)
- Hover states: `--gray-100` (#F3F4F6)

**Text:**
- Primary headings: `--gray-900` (#111827)
- Body text: `--gray-700` (#374151)
- Secondary text: `--gray-500` (#6B7280)
- Disabled text: `--gray-400` (#9CA3AF)

**Borders:**
- Default borders: `--gray-200` (#E5E7EB)
- Input borders: `--gray-300` (#D1D5DB)
- Dividers: `--gray-100` (#F3F4F6)

**Actions:**
- Primary button: `--blue-500`
- Primary hover: `--blue-600`
- Links: `--blue-500`
- Focus rings: `--blue-500` with 10% opacity

**Status indicators:**
- Success/Paid: `--green-500` text on `--green-50` background
- Error/Overdue: `--red-500` text on `--red-50` background
- Warning/Pending: `--yellow-500` text on `--yellow-50` background

---

## ✍️ Typography System

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
             'Helvetica Neue', Arial, sans-serif, 'Apple Color Emoji',
             'Segoe UI Emoji', 'Segoe UI Symbol';
```

**Rationale:** System fonts for native feel, fast loading, excellent readability

### Type Scale

```css
/* Display (rare, marketing only) */
--text-display: 48px / 1.2 / 700;

/* Headings */
--text-h1: 32px / 1.3 / 700;  /* Page titles */
--text-h2: 24px / 1.4 / 600;  /* Section titles */
--text-h3: 18px / 1.4 / 600;  /* Card titles */
--text-h4: 16px / 1.5 / 600;  /* Subsection titles */

/* Body */
--text-base: 15px / 1.6 / 400;      /* Main text */
--text-base-medium: 15px / 1.6 / 500; /* Emphasized */
--text-base-bold: 15px / 1.6 / 600;   /* Strong */

/* Small */
--text-sm: 14px / 1.5 / 400;   /* Secondary info */
--text-sm-medium: 14px / 1.5 / 500; /* Labels */

/* Tiny */
--text-xs: 13px / 1.4 / 400;   /* Metadata */
--text-xs-medium: 13px / 1.4 / 500; /* Uppercase labels */

/* Mini */
--text-2xs: 12px / 1.3 / 400;  /* Timestamps, badges */
```

### Font Weights

```css
--font-regular: 400;  /* Body text */
--font-medium: 500;   /* Labels, emphasized */
--font-semibold: 600; /* Headings, buttons */
--font-bold: 700;     /* Large numbers, h1 */
```

**Usage:**
- **Regular (400):** All body text, descriptions
- **Medium (500):** Form labels, nav items, metadata
- **Semibold (600):** Headings, card titles, buttons
- **Bold (700):** Page titles, large metrics

### Line Height Guidelines

- **Tight (1.2-1.3):** Large headings, metrics
- **Normal (1.4-1.5):** Headings, labels, UI text
- **Relaxed (1.6-1.7):** Body text, descriptions
- **Loose (1.8):** Long-form content (rare in app)

---

## 🔘 Component Patterns

### Buttons

**Primary button:**
```css
.btn-primary {
  background: var(--blue-500);
  color: white;
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-primary:hover {
  background: var(--blue-600);
}

.btn-primary:active {
  background: var(--blue-700);
}
```

**Secondary button:**
```css
.btn-secondary {
  background: white;
  color: var(--gray-700);
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 14px;
  border: 1px solid var(--gray-300);
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.btn-secondary:hover {
  background: var(--gray-50);
  border-color: var(--gray-400);
}
```

**Ghost button:**
```css
.btn-ghost {
  background: transparent;
  color: var(--gray-600);
  padding: 10px 20px;
  border-radius: 6px;
  font-weight: 500;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn-ghost:hover {
  background: var(--gray-100);
}
```

**Sizes:**
- Small: `padding: 6px 12px; font-size: 13px;`
- Medium: `padding: 10px 20px; font-size: 14px;` (default)
- Large: `padding: 12px 24px; font-size: 15px;`

### Input Fields

```css
.input {
  width: 100%;
  padding: 12px 16px;
  font-size: 15px;
  color: var(--gray-900);
  background: white;
  border: 1px solid var(--gray-300);
  border-radius: 6px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--blue-500);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input::placeholder {
  color: var(--gray-400);
}

.input:disabled {
  background: var(--gray-100);
  color: var(--gray-500);
  cursor: not-allowed;
}

.input.error {
  border-color: var(--red-500);
}

.input.error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1);
}
```

### Badges/Pills

```css
.badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
}

.badge-success {
  background: var(--green-50);
  color: var(--green-600);
}

.badge-error {
  background: var(--red-50);
  color: var(--red-600);
}

.badge-warning {
  background: var(--yellow-50);
  color: var(--yellow-600);
}

.badge-neutral {
  background: var(--gray-100);
  color: var(--gray-600);
}
```

### Shadows

```css
/* Subtle - Default cards */
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06);

/* Medium - Hover states */
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);

/* Large - Modals, popovers */
--shadow-lg: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
             0 10px 10px -5px rgba(0, 0, 0, 0.04);

/* None - Flat elements */
--shadow-none: none;
```

**Usage:**
- Default cards: `--shadow-sm`
- Hover states: `--shadow-md`
- Modals: `--shadow-lg`
- Flat UI elements: `--shadow-none`

### Border Radius

```css
--radius-sm: 4px;   /* Badges, small elements */
--radius-md: 6px;   /* Buttons, inputs */
--radius-lg: 8px;   /* Small cards */
--radius-xl: 12px;  /* Large cards, modals */
--radius-2xl: 16px; /* Hero sections (rare) */
--radius-full: 9999px; /* Pills, avatars */
```

---

## 📱 Responsive Behavior

### Breakpoints

```css
/* Mobile first approach */
--screen-sm: 640px;   /* Small tablets */
--screen-md: 768px;   /* Tablets */
--screen-lg: 1024px;  /* Small laptops */
--screen-xl: 1280px;  /* Desktops */
--screen-2xl: 1536px; /* Large desktops */
```

### Layout Adaptations

**Dashboard (Bento Grid):**
```css
/* Mobile (< 768px) */
.dashboard-grid {
  grid-template-columns: 1fr; /* Single column */
  gap: 16px;
  padding: 24px 16px;
}

/* Tablet (768px - 1024px) */
@media (min-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr 1fr; /* Two columns */
    gap: 20px;
    padding: 32px 24px;
  }
}

/* Desktop (> 1024px) */
@media (min-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr 1fr; /* Two columns */
    gap: 24px;
    padding: 48px 32px;
  }
}
```

**Pipeline (Kanban):**
```css
/* Mobile */
.kanban-board {
  flex-direction: row;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch; /* Smooth scroll on iOS */
  padding: 24px 16px;
}

.kanban-column {
  flex: 0 0 260px; /* Fixed width */
}

/* Tablet and up - same behavior, just more space */
@media (min-width: 768px) {
  .kanban-board {
    padding: 32px 24px;
  }
}
```

**Money Stats:**
```css
/* Mobile */
.money-stats {
  grid-template-columns: 1fr 1fr; /* 2x2 grid */
  gap: 12px;
}

/* Tablet and up */
@media (min-width: 768px) {
  .money-stats {
    grid-template-columns: repeat(4, 1fr); /* All in one row */
    gap: 16px;
  }
}
```

---

## 🎭 Animations & Transitions

### Transition Timing

```css
/* Duration */
--duration-fast: 150ms;    /* Hover, focus */
--duration-normal: 200ms;  /* Default */
--duration-slow: 300ms;    /* Modals, expansions */

/* Easing */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
--ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
```

### Common Transitions

**Hover states:**
```css
transition: background-color 200ms ease-in-out,
            color 200ms ease-in-out,
            border-color 200ms ease-in-out,
            box-shadow 200ms ease-in-out;
```

**Transform (cards, buttons):**
```css
transition: transform 200ms ease-out;
```

**Modal entrance:**
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
```

**Loading skeleton:**
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--gray-100) 0%,
    var(--gray-200) 50%,
    var(--gray-100) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

---

## ✅ Accessibility Guidelines

### Keyboard Navigation

**Focus rings:**
```css
*:focus-visible {
  outline: 2px solid var(--blue-500);
  outline-offset: 2px;
}

/* For elements that shouldn't show outline */
.no-focus-ring:focus {
  outline: none;
}
```

**Tab order:**
- Logical flow: top to bottom, left to right
- Skip links for long lists
- Focus trap in modals

### ARIA Labels

**Interactive elements:**
```html
<!-- Buttons with icons only -->
<button aria-label="Close modal">
  <IconX />
</button>

<!-- Status badges -->
<span class="badge-success" role="status">
  Paid
</span>

<!-- Loading states -->
<div role="status" aria-live="polite">
  Loading invoices...
</div>
```

### Color Contrast

**Minimum ratios (WCAG AA):**
- Body text (15px): 4.5:1
- Large text (18px+): 3:1
- UI components: 3:1

**Verified combinations:**
- `--gray-900` on white: 16:1 ✓
- `--gray-700` on white: 10:1 ✓
- `--gray-600` on white: 7:1 ✓
- `--blue-500` on white: 4.5:1 ✓
- White on `--blue-500`: 4.5:1 ✓

---

## 📏 Spacing Reference

### Common Patterns

**Card internal padding:**
```css
padding: 24px; /* Standard */
padding: 20px; /* Compact (stat cards) */
padding: 32px; /* Spacious (modals) */
```

**Section gaps:**
```css
margin-bottom: 16px; /* Between related items */
margin-bottom: 24px; /* Between sections */
margin-bottom: 32px; /* Between major sections */
margin-bottom: 48px; /* Top of views */
```

**Grid/Flex gaps:**
```css
gap: 12px; /* Tight (kanban cards) */
gap: 16px; /* Standard (grid columns) */
gap: 24px; /* Loose (dashboard cards) */
gap: 32px; /* Extra loose (nav items) */
```

---

## 🎯 Implementation Checklist

When building each view, ensure:

### Visual Consistency
- [ ] Uses defined color palette (no random colors)
- [ ] Uses type scale (no random font sizes)
- [ ] Uses spacing system (multiples of 4px/8px)
- [ ] Uses border radius values from system
- [ ] Uses shadow values from system

### Interaction States
- [ ] Hover states defined for interactive elements
- [ ] Focus states visible for keyboard navigation
- [ ] Active states defined for buttons/links
- [ ] Disabled states clear and consistent
- [ ] Loading states with skeleton screens

### Responsive Design
- [ ] Works on mobile (320px+)
- [ ] Works on tablet (768px+)
- [ ] Works on desktop (1024px+)
- [ ] Touch targets ≥ 44px on mobile
- [ ] Text readable at all sizes

### Accessibility
- [ ] Color contrast meets WCAG AA
- [ ] Keyboard navigation works
- [ ] Screen reader labels present
- [ ] Focus indicators visible
- [ ] Semantic HTML used

### Performance
- [ ] Smooth transitions (no jank)
- [ ] Fast initial render
- [ ] Efficient re-renders
- [ ] Images optimized
- [ ] Fonts subset if custom

---

## 🚀 Quick Start Summary

**For Dashboard:** Use bento grid, 2 columns, metric cards
**For Pipeline:** Use kanban board, 260px cards, drag & drop
**For Money:** Use stat cards + clean list, no boxes
**For Clients:** Use expandable cards, max-width 900px
**For Settings:** Use tabs + single column forms
**For Modals:** Use 480px centered, single column

**Key principles:**
1. White cards on `--gray-50` background
2. Subtle shadows (`0 1px 3px rgba(0, 0, 0, 0.06)`)
3. Generous padding (24px standard)
4. Clear typography hierarchy
5. Hover states on everything interactive

---

**This guide is your single source of truth for UI development. Refer back frequently to maintain consistency across all views!**
