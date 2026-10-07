# zanlabs

Portfolio for **fawuzan** ([@fozagtx](https://github.com/fozagtx)): a forward-deployed engineer building AI agents, onchain payment rails and developer tools.

It's built with [Base UI](https://base-ui.com) React components and a token-driven theme, the same pattern [Graphical](https://www.graphicalui.com/) uses for its visual theme editor.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/
npm run lint
```

The build uses a relative base path, so `dist/` can be hosted anywhere: GitHub Pages, Netlify, Vercel, or a sub-folder.

## Edit the content

All copy lives in [`src/data/profile.ts`](src/data/profile.ts): name, headline, intro, facts, about text, stack, services, and the project list. To add a project, append an entry to `projects`. Set `featured: true` to pin it to the top. The optional `highlights` bullets show up in the project dialog.

## Change the look

Every color, radius, font, shadow and duration is a CSS variable in [`src/theme/tokens.css`](src/theme/tokens.css). There are three built-in styles, which visitors can switch from the **Theme** button:

| Style    | Feel                                                        |
| -------- | ----------------------------------------------------------- |
| `base`   | Base UI's own look: sharp corners, ink outlines, hard shadows |
| `soft`   | Warm paper, rounded corners, Instrument Serif headings      |
| `signal` | Terminal feel: Geist Mono headings, acid-lime accent        |

Each style also has light and dark modes, and by default the site follows the operating system. To use a theme exported from Graphical, paste its values over one of the style blocks. Colors come in `-l` / `-d` (light/dark) pairs.

## Base UI components used

| Component            | Where                                                      |
| -------------------- | ---------------------------------------------------------- |
| Tabs                 | Filtering projects by category                             |
| Dialog               | Project details (one dialog with detached triggers)        |
| Accordion            | "What I do" in the About section                           |
| Popover              | Theme picker                                               |
| Toggle Group, Toggle | Style and mode choices inside the theme picker             |
| Toast                | "Email copied" confirmation anchored to the button         |
| Tooltip              | GitHub link in the header                                  |
| Avatar               | Profile photo with initials fallback                       |
| Button               | Buttons across the site                                    |

## Structure

```
src/
  data/profile.ts          content
  theme/tokens.css         design tokens (styles × modes)
  theme/global.css         base element styles
  theme/useTheme.ts        style/mode state, saved to localStorage
  components/ui/           themed Base UI wrappers (Button, Hint, CopyEmail)
  components/ThemeSwitcher.tsx
  sections/                Header, Hero, Work, About, Contact, Footer
```
