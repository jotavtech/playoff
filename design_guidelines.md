# Playoff Music Player - Design Guidelines

## Design Approach
**Reference-Based: Spotify + Apple Music Hybrid**

Draw inspiration from Spotify's efficient information hierarchy and Apple Music's clean typography. The player must prioritize functionality and immediate accessibility while maintaining visual appeal. This is a utility-focused application where performance and usability drive every decision.

## Typography System

**Primary Font**: Inter or DM Sans (via Google Fonts CDN)
**Secondary Font**: System UI fallback for optimal performance

**Hierarchy**:
- **Headings**: 32px/28px/24px (Desktop/Tablet/Mobile), font-weight: 700
- **Track Titles**: 16px, font-weight: 600
- **Artist Names**: 14px, font-weight: 400
- **Metadata** (duration, time): 13px, font-weight: 500
- **UI Labels**: 12px, font-weight: 500, uppercase with letter-spacing: 0.5px

## Layout Structure

**Main Application Shell**:
- **Sidebar Navigation** (Desktop): 240px fixed width, full height
  - Logo/branding at top
  - Primary navigation (Home, Search, Library, Playlists)
  - Pinned playlists section
  - Hide on mobile, replace with bottom navigation bar

- **Main Content Area**: Fluid width, full height minus player bar
  - Responsive grid for content (grid-cols-2 md:grid-cols-4 lg:grid-cols-6 for album/playlist cards)
  - max-w-7xl container for playlist/album detail views

- **Player Bar** (Fixed Bottom): Full width, 90px height
  - Three-column layout (track info / controls / volume+extras)
  - Always visible, elevated above other content

- **Mobile Bottom Navigation**: 64px height, 4-5 primary actions

## Spacing System

**Tailwind Units**: Use 2, 3, 4, 6, 8, 12, 16, 20, 24 for consistency

**Application Spacing**:
- Section padding: p-6 (mobile), p-8 (desktop)
- Card gaps: gap-4 (mobile), gap-6 (desktop)
- Content margins: mb-8 between major sections
- Player controls: space-x-4 for horizontal buttons
- List items: py-2 for compact lists, py-3 for comfortable spacing

## Component Library

### Navigation Components
**Sidebar Menu**:
- Logo/brand: h-16, centered or left-aligned
- Nav items: py-3 px-4, w-full, text-left, hover state required
- Active state: Distinct indicator (border-l-4 or background highlight)

**Mobile Bottom Nav**:
- 5 items max, evenly distributed (flex justify-around)
- Icons: 24px, labels: 10px (optional on smaller screens)

### Music Display Components

**Album/Playlist Cards**:
- Square aspect ratio (aspect-square)
- Cover art container with rounded corners (rounded-lg)
- Title below: truncate text with max-w-full
- Artist/metadata: text-sm, truncate
- Hover state: Subtle scale or opacity change

**Track List Items**:
- Height: 56px per track
- Layout: Grid with columns for [#/play button | artwork | title/artist | duration | actions]
- Artwork thumbnail: 40px square (rounded-sm)
- Title: truncate, Artist: truncate text-sm
- Right-align duration and action buttons

**Now Playing Display** (in player bar):
- Artwork: 64px square (rounded)
- Track info: Vertical stack, truncate long titles
- Like/save button adjacent

### Playback Controls

**Primary Controls** (Player Bar Center):
- Control button sizes: 40px circular
- Play/Pause: 48px (larger, primary action)
- Spacing: space-x-3 between buttons
- Icons: Previous, Play/Pause, Next (minimum), Shuffle and Repeat (optional flanking)

**Progress Bar**:
- Full width in player bar or detail view
- Height: 4px track, 12px thumb on hover
- Time indicators: Flanking (current / total duration)

**Volume Control**:
- Horizontal slider: w-24 (desktop), hidden or icon-only (mobile)
- Mute toggle icon

### Queue Management

**Queue Panel** (Slide-in or Modal):
- Header: "Up Next" with clear action
- Draggable list items with reorder handles
- Current track highlighted
- Remove buttons (hover state)

**Playlist View**:
- Header with cover art (240px square), title (text-3xl), metadata
- Action buttons: Play, Shuffle, Like/Save (space-x-3)
- Track listing below with sticky header

### Search & Discovery

**Search Bar**:
- Full-width input (max-w-2xl)
- Height: 44px, rounded-full
- Icon: Left-aligned, 20px
- Clear button: Right-aligned (when active)

**Search Results**:
- Categorized sections (Tracks, Albums, Artists, Playlists)
- Grid layout for visual items (grid-cols-2 md:grid-cols-4)
- List layout for tracks

## Responsive Breakpoints

- **Mobile**: < 768px - Single column, bottom nav, simplified player
- **Tablet**: 768px - 1024px - Two columns, sidebar or tabs, full player
- **Desktop**: > 1024px - Multi-column grids, full sidebar, enhanced player

**Mobile-Specific Considerations**:
- Larger touch targets (min 44px)
- Swipe gestures for queue management
- Full-screen player view on track tap
- Sticky player bar (always accessible)

## Animations

**Use Sparingly - Performance Critical**:
- Play/pause button icon transition (300ms ease)
- Smooth progress bar updates (linear progression)
- Page transitions: Simple fade (200ms)
- Card hover: Scale 1.02 or opacity change (200ms)
- **No auto-playing animations** - all triggered by user interaction

## Images

**Album Artwork Priority**:
- Always use actual album/playlist cover images from Spotify API
- Display at multiple sizes: 40px (list), 160px (card), 240px+ (detail view)
- Implement lazy loading for grids
- Fallback: Solid placeholder with music note icon

**Hero Section**: None - This is a functional app, not a marketing site. Open directly to user's library or continue playing view.

## Critical UX Patterns

**Playback State Sync**:
- Visual feedback for buffering/loading states
- Disabled state for controls during transitions
- Error states with retry actions
- Offline mode indication

**Touch Optimization**:
- Minimum button size: 44px × 44px
- Spacing between touch targets: min 8px
- Swipe gestures for common actions (next track, queue)

**Accessibility**:
- Keyboard navigation for all controls (Space = play/pause, Arrow keys = seek)
- Screen reader labels for all icon buttons
- Focus states for all interactive elements (ring-2 ring-offset-2)
- ARIA live regions for playback updates