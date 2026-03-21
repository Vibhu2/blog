# Vibhu's Blog — hugo-toha-source

Personal blog and portfolio built with Hugo and the Toha theme. Deployed to [vibhu2.github.io](https://vibhu2.github.io).

## Stack

- Hugo Extended 0.146.0+
- Toha theme (via Go modules)
- GitHub Actions for auto-deploy
- GitHub Pages for hosting

## Local Development

```powershell
hugo mod tidy
hugo mod npm pack
npm install
hugo server -w
```

Site runs at `http://localhost:1313`

> Last deploy trigger: retry after cancel
