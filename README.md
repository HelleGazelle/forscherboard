A Kanban board for satellite departments. Retreive tickets from multiple Kanban boards like JIRA and integrate them in your own simple workflow.
Work together on the board with in real time via socket.io.

# Middleware
## Available endpoints in the middleware

### POST: `/api/ticket`

Endpoint for JIRA webhooks when a ticket got updated or created. The middleware automatically detects the relevance of the ticket and and therefore selects the proper way to handle it.

# React App

## Configuration

Insert your network address into the related field in the .env file in the root directory.

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!