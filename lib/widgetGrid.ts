/* Single source of truth for desktop widget card geometry. Before
   this, every widget hardcoded its own slightly-different padding
   (14px NowPlayingWidget, 18px AIToolsWidget, 22px/18px ClockWidget)
   with no shared pattern — the opposite of how real Apple widgets
   work, where every size class in a family shares one content-margin
   convention so mixed widgets still read as one coherent grid.

   WIDGET_UNIT/WIDGET_GAP were already established (PhotoWidget's
   260px width, DesktopWidgetStack/RightWidgetStack's 14px gap) —
   pulled here rather than redeclared so every widget references the
   same values instead of copies that can drift.

   COMPACT_CARD_HEIGHT is the shared height for the right-hand
   AIToolsWidget/ClockWidget pair: AIToolsWidget's icon grid is
   content-tight with zero slack (16px padding + two 64px rows + one
   16px row-gap = 176px exactly), so that's the real floor: ClockWidget
   centers its shorter content inside the same frame rather than the
   two cards sitting at visibly different heights in the same column. */

export const WIDGET_UNIT = 260;
export const WIDGET_GAP = 14;
export const WIDGET_PADDING = 16;
export const WIDGET_RADIUS = 20;
export const COMPACT_CARD_HEIGHT = 176;
