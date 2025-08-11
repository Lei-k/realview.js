# Acknowledgments

## Third-Party Components

### HLS.js Demuxer Implementation
- **Source**: [gliese1337/HLS.js](https://github.com/gliese1337/HLS.js/)
- **Original Author**: gliese1337
- **License**: MPL-2.0
- **Description**: TypeScript implementation of MPEG-TS demuxer components
- **Files**: 
  - `packages/core/src/lib/dumuxer/pat.ts`
  - `packages/core/src/lib/dumuxer/stream.ts`
  - `packages/core/src/lib/dumuxer/packet.ts`
  - `packages/core/src/lib/dumuxer/index.ts`
  - Other demuxer related files

### Original C++ Implementation
- **Source**: [clark15b/tsdemuxer](https://github.com/clark15b/tsdemuxer)
- **Original Author**: Anton Burdinuk
- **Description**: C++ implementation that was later ported to TypeScript

## License Compliance

All third-party components are used in compliance with their respective licenses.

## Project History

The demuxer components in RealView.js were adapted from the HLS.js project,
which provides a pure JavaScript implementation of HTTP Live Streaming.
These components handle the low-level parsing of MPEG Transport Stream (MPEG-TS)
data, including PAT (Program Association Table), PMT (Program Map Table),
and PES (Packetized Elementary Stream) parsing.

## Contributing

When contributing to RealView.js, please ensure that any third-party code
is properly attributed and licensed appropriately. 