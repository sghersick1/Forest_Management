# Description and Agent Instructions

The Right Sidebar is a persistent component positioned on the right side of the map interface. It supports multiple variations depending on the user's current activity, such as viewing parcel information, inspecting forest stands, and editing attributes. While its position and overall structure remain consistent, its content dynamically changes to support different workflows.

## Development Instructions

- Create a reusable `RightSidebar` parent component responsible for the sidebar's layout, positioning, and shared styling.
- Implement distinct sidebar views as separate child components when their functionality or layouts differ significantly.
- Use TypeScript union types and React state to control which sidebar view is currently displayed.
- Share common UI elements (headers, buttons, sections) across variants to avoid duplication.
- Allow external components, particularly the MapLibre map, to trigger sidebar changes through shared state.

## Goal

Build a single, persistent sidebar system that dynamically renders the appropriate content without duplicating the sidebar's underlying structure.
