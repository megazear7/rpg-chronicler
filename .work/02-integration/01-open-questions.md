# Open Questions

## Contentful

- Should new events continue leaving `ordering` unset when the selected adventure's existing events mostly omit it, or do you want RPG Chronicler to start assigning a derived ordering value?
    - Omit it.
- Do you want RPG Chronicler to set `year`, `month`, and `day` on new `event` entries from the submission flow, or should those remain unset unless manually provided?
    - Check for the year, month, and day of the most recent event, increase the day by one, and use that as the year, month, day of the new event. Make sure to account for month and year rollovers.

## Suno

- What Suno API product and auth flow should this app target? I can wire a generic REST integration, but I need the intended endpoint/auth contract if you already have one.
    - Let's scrap the suno integration. Instead the user can just provide a url of a suno song in a text field.

## Notion

- What Notion database or parent page should receive DM notes? The implementation can target either, but I need the final destination identifier.
    - Parent page: https://www.notion.so/Heroic-Adventures-35d290435c2f804c8748f861c9151044?source=copy_link
    - I added the api key in the `NOTION_API_KEY` environment variable.
