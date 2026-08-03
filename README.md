# Global Tool Radar

Global Tool Radar discovers fast-growing overseas AI and productivity tools, evaluates their opportunity for Chinese audiences, and supports evidence-backed original content production for Douyin and Bilibili.

## What this repository is

- A multi-source radar for YouTube, Product Hunt, GitHub, and official product pages.
- A deterministic opportunity-scoring pipeline with explicit data coverage.
- A future test-evidence and original screen-recording production workspace.

## What this repository is not

- A YouTube downloading or watermark-removal tool.
- An automatic copyright-evasion system.
- An unattended payment, account-registration, or bulk-publishing bot.

## v0.1 foundation

The initial implementation establishes:

- canonical contracts;
- deterministic weighted scoring;
- missing-data renormalization rather than fake zeroes;
- independent rights and security hard gates;
- an executable scoring demo and tests.

## Run locally

```bash
npm run check
npm test
npm run demo
```

See [`docs/architecture/toolradar-v0.1.md`](docs/architecture/toolradar-v0.1.md) for the bounded architecture and delivery sequence.
