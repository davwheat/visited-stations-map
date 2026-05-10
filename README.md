# Visited Stations Map

Google Sheets-powered map of visited railway stations, inspired by [t5r7's station mapper](https://github.com/t5r7/station-mapper).

- Powered by Cloudflare Pages and Cloudflage Pages Functions
- Data stored in easily-maintainable Google Sheets
- Automatically updates map when data changes
- Uses performant, self-hosted vector OSM tiles with MapLibre GL JS
- Show transit operator branding
- Filter by transport type (light/heavy rail, etc.)

## Quirks

By default, stations with a `visitedDate` in the future are hidden from the map. These can be shown by pressing the "Show future stations" link
at the bottom of the webpage, or by adding `?future=true` to the URL. When shown, these will appear in greyscale and state "Planned to visit" in
their information pop-up.

## Local development

1. Clone the repository
2. Install dependencies with `yarn install`
3. Run with `yarn dev`

## Deployment

Changes are automatically deployed using GitHub Actions to Cloudflare Pages when pushing to the `deploy` branch.

## Making your own

You'll need a Cloudflare account for this unless you change how the project works. You can sign up for free at
[Cloudflare](https://dash.cloudflare.com/sign-up), and usage should happily fit within your free usage limits. You don't need to add a payment
method to use Cloudflare Pages.

1.  Fork and update repository and code 2. [Fork this repository](https://github.com/davwheat/visited-stations-map/fork) 3. On your fork, enable
    Actions through the Actions tab

2.  Create a clone of my [Google Sheet](https://docs.google.com/spreadsheets/d/1ZRBE-9i4_WmMmO5h1pIMwrF1owW95Qc-ElLcmf0ct3g/edit) and start
    filling it in with your own data
3.  Update code as required
    1.  Update the Google Sheet ID in [`functions/api/stations.ts`](functions/api/stations.ts)
    2.  You will also need to update the [`html/map.js`](html/map.js) file to use the default OSM raster tile server by swapping the lines
        specified in the code comments. By default, it will attempt to use my own self-hosted vector tile server, which will not work for you.

        > Info
        >
        > You can change the tile server URL to another map tile provider if you wish by editing
        > [`html/map-styles/osm-raster.json`](html/map-styles/osm-raster.json)

4.  Create a new Pages project
    1. In your Cloudflare account head to "Workers & Pages", then "Create application".
    2. Choose the "Pages" tab, then "Upload assets".
    3. Enter a name for your project, such as "visited-stations-map"
    4. Press Create
    5. Just go back to the "Workers & Pages" section now; you don't need to upload any assets like it is asking.
5.  Create a Cloudflare API token
    1. Clicking the user icon in the top right, and go to My Profile
    2. Choose "API Tokens", then "Create Custom token"
    3. Give it the "Cloudflare Pages" permission for your account.
    4. Hit "Continue to summary", then "Create token".
    5. **Make a copy of this.** You can't view it again after you leave the page.
6.  Add the API token and your account ID to your GitHub repository secrets
    1. Go to your repository, then "Settings", then "Secrets and variables"
    2. Add a new repository secret called `CLOUDFLARE_API_TOKEN` with the value of your API token
    3. Add a new repository secret called `CLOUDFLARE_ACCOUNT_ID` with you Cloudflare account ID
       - This is in the URL to your Cloudflare Dashboard, e.g. for `https://dash.cloudflare.com/1234567890abcdef`, `1234567890abcdef` is your
         account ID
    4. Add a repository variable named `CLOUDFLARE_PAGES_PROJECT` with the name of your Pages project
7.  Commit the changes to the `functions/api/stations.ts` file, then open and merge a pull request from the `main` branch to the `deploy` branch
8.  The website should be automatically deployed to Cloudflare Pages. You can add a custom domain through the Cloudflare Dashboard as required.
