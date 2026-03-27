import { Router } from 'src/core/router'

Router.get('/', ({ res }) => {
  res
    .setHeader('Content-Type', 'text/html')
    .send('Welcome to the Express application!')
    .status(200)
})
