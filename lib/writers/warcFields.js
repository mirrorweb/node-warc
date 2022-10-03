const warcHeader = ({ now, fileName, rid, len }) => `WARC/1.0\r
WARC-Type: warcinfo\r
WARC-Date: ${now}\r
WARC-Filename: ${fileName}\r
WARC-Record-ID: <urn:uuid:${rid}>\r
Content-Type: application/warc-fields\r
Content-Length: ${len}\r\n`;

const warcHeaderContent = ({ version, isPartOfV, warcInfoDescription, ua }) => `software: node-warc/${version}\r
format: WARC File Format 1.0\r
conformsTo: http://bibnum.bnf.fr/WARC/WARC_ISO_28500_version1_latestdraft.pdf\r
isPartOf: ${isPartOfV}\r
description: ${warcInfoDescription}\r
robots: ignore\r
http-header-user-agent: ${ua}\r\n`;

const warcMetadataHeader = function({ targetURI, now, concurrentTo, rid, len, wid }) {
    let header = `WARC/1.0\r
    WARC-Type: metadata\r
    WARC-Target-URI: ${targetURI}\r
    WARC-Date: ${now}\r
    WARC-Concurrent-To: <urn:uuid:${concurrentTo}>\r
    WARC-Record-ID: <urn:uuid:${rid}>\r
    Content-Type: application/warc-fields\r
    Content-Length: ${len}\r\n`;

    if (wid) header = header + `WARC-Warcinfo-ID: <urn:uuid:${wid}>\r\n`;

    return header;
};

const warcRequestHeader = function({ targetURI, now, concurrentTo, rid, len, wid, digest }) {
    let header = `WARC/1.0\r
WARC-Type: request\r
WARC-Target-URI: ${targetURI}\r
WARC-Date: ${now}\r
WARC-Record-ID: <urn:uuid:${rid}>\r
Content-Type: application/http; msgtype=request\r
Content-Length: ${len}\r\n`;

    if (concurrentTo) header = header + `WARC-Concurrent-To: <urn:uuid:${concurrentTo}>\r\n`;
    if (wid) header = header + `WARC-Warcinfo-ID: <urn:uuid:${wid}>\r\n`;
    if (digest) header = header + `WARC-Payload-Digest: ${digest}\r\n`;

    return header;
};

const warcResponseHeader = function({ targetURI, now, rid, len, wid, digest }) {
    let header = `WARC/1.0\r
WARC-Type: response\r
WARC-Target-URI: ${targetURI}\r
WARC-Date: ${now}\r
WARC-Record-ID: <urn:uuid:${rid}>\r
Content-Type: application/http; msgtype=response\r
Content-Length: ${len}\r\n`;

    if (wid) header = header + `WARC-Warcinfo-ID: <urn:uuid:${wid}>\r\n`;
    if (digest) header = header + `WARC-Payload-Digest: ${digest}\r\n`;

    return header;
};

const CRLF = '\r\n';
const recordSeparator = `${CRLF}${CRLF}`;

const warcFields = {
    warcHeader,
    warcHeaderContent,
    warcRequestHeader,
    warcResponseHeader,
    warcMetadataHeader,
    recordSeparator,
    CRLF
};

module.exports = warcFields;
