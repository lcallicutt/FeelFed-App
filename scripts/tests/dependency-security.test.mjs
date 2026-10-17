import assert from 'node:assert/strict';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../../', import.meta.url));
const store = `${root}node_modules/.pnpm`;
const lock = readFileSync(`${root}pnpm-lock.yaml`, 'utf8');

// Require the exact locked installation, including its pnpm patch hash.
function dependency(name, version, patched = false) {
  const prefix = `${name.replace('/', '+')}@${version}`;
  const hash = patched
    ? createHash('sha256').update(readFileSync(`${root}patches/${name}@${version}.patch`)).digest('hex')
    : null;
  const entry = readdirSync(store).find(path =>
    path === (patched ? `${prefix}_patch_hash=${hash}` : prefix)
  );
  assert.ok(entry, `Missing installed ${prefix}${patched ? ' with patch' : ''}`);
  const require = createRequire(`${store}/${entry}/node_modules/${name}/package.json`);
  return { value: require(name), require };
}

test('lockfile removes all versions with published security fixes', () => {
  for (const old of [
    'proxy-addr@2.0.7', 'source-map-js@1.2.1', 'brace-expansion@5.0.9',
    'shell-quote@1.10.0', 'uuid@7.0.3', 'fast-uri@3.1.7',
    'decode-uri-component@0.2.2',
  ]) {
    assert.ok(!lock.includes(`${old}:`), `Vulnerable lockfile record: ${old}`);
  }
  for (const name of ['braces@3.0.3', 'node-forge@1.4.0', 'query-string@7.1.3']) {
    const hash = createHash('sha256').update(readFileSync(`${root}patches/${name}.patch`)).digest('hex');
    assert.ok(lock.includes(`${name}(patch_hash=${hash})`), `Missing current locked patch: ${name}`);
  }
});

test('proxy-addr does not trust arbitrary IPv4 through short IPv6 prefixes', () => {
  const { value: proxyaddr } = dependency('proxy-addr', '2.0.8');
  for (const subnet of ['::/1', '::ffff:10.0.0.0/8']) {
    const trust = proxyaddr.compile([subnet]);
    assert.equal(trust('203.0.113.1', 0), false);
  }
  const trust = proxyaddr.compile(['10.0.0.0/8']);
  assert.equal(trust('10.1.2.3', 0), true);
  assert.equal(trust('203.0.113.1', 0), false);
});

test('brace-expansion bounds chained, nested and rewrite-heavy parsing', () => {
  const { value } = dependency('brace-expansion', '5.0.12');
  const expand = value.expand;
  assert.deepEqual(expand('file-{a,b}-{1..2}'), [
    'file-a-1', 'file-a-2', 'file-b-1', 'file-b-2',
  ]);
  for (const pattern of [
    '{' + '{a},'.repeat(7000) + 'b}',
    '{{x},' + 'a,'.repeat(125000) + 'b}',
    '{a,'.repeat(4000) + 'z' + '}'.repeat(4000),
    '{'.repeat(3200) + 'a,b' + '}'.repeat(3200),
    '{a}' + '}'.repeat(64000) + ',z}',
  ]) {
    assert.doesNotThrow(() => expand(pattern, { max: 10, maxLength: 1000000 }));
  }
});

test('braces rejects excessive AST depth without native stack exhaustion', () => {
  const { value: braces } = dependency('braces', '3.0.3', true);
  assert.deepEqual(braces.expand('file-{a,b}-{1..2}'), [
    'file-a-1', 'file-a-2', 'file-b-1', 'file-b-2',
  ]);
  assert.deepEqual(braces('file-{a,b}'), ['file-(a|b)']);
  for (const pattern of [
    '{'.repeat(4000) + 'a,b' + '}'.repeat(4000),
    '('.repeat(4000) + 'x' + ')'.repeat(4000),
    '{('.repeat(2000) + 'x' + ')}'.repeat(2000),
  ]) {
    for (const method of [braces, braces.expand, braces.compile, braces.parse, braces.stringify]) {
      assert.throws(() => method(pattern), {
        name: 'SyntaxError', message: /maximum nesting depth/,
      });
    }
  }
  assert.doesNotThrow(() => braces.parse('\\{'.repeat(1000)));
  assert.doesNotThrow(() => braces.parse('"' + '{'.repeat(1000) + '"'));
});

test('braces recursive walkers also bound caller-supplied AST depth', () => {
  const { value: braces, require } = dependency('braces', '3.0.3', true);
  const nested = (depth, cycle = false) => {
    const root = { type: 'root', nodes: [] };
    let node = root;
    for (let i = 0; i < depth; i++) {
      const child = { type: 'paren', nodes: [], parent: node };
      node.nodes.push(child);
      node = child;
    }
    node.nodes.push(cycle ? root : { type: 'text', value: 'x' });
    return root;
  };
  // Test fresh trees because expand mutates the AST, and exercise internal
  // walkers too: the parser is not the only entry point exposed by this package.
  for (const method of [
    braces.compile, braces.expand, braces.stringify,
    require('braces/lib/compile'), require('braces/lib/expand'), require('braces/lib/stringify'),
  ]) {
    assert.doesNotThrow(() => method(nested(20)));
    for (const ast of [nested(4000), nested(20, true)]) {
      assert.throws(() => method(ast), {
        name: 'SyntaxError', message: /maximum nesting depth/,
      });
    }
  }
});

test('Expo signing and glob consumers resolve the locked security patches', () => {
  const mobile = createRequire(`${root}artifacts/feelfed/package.json`);
  const expo = createRequire(mobile.resolve('expo/package.json'));
  const cli = createRequire(expo.resolve('@expo/cli'));
  const certificates = createRequire(cli.resolve('@expo/code-signing-certificates'));
  const sandbox = createRequire(`${root}artifacts/mockup-sandbox/package.json`);
  const glob = createRequire(sandbox.resolve('fast-glob'));
  const micromatch = createRequire(glob.resolve('micromatch'));
  for (const [consumer, name, version] of [
    [certificates, 'node-forge', '1.4.0'],
    [micromatch, 'braces', '3.0.3'],
  ]) {
    const { require: installed } = dependency(name, version, true);
    assert.equal(consumer.resolve(name), installed.resolve(name));
  }
});

test('node-forge rejects extra nested DigestAlgorithm elements', () => {
  const { value: forge } = dependency('node-forge', '1.4.0', true);
  const { privateKey, publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 1024,
    publicExponent: 3,
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
  const signer = forge.pki.privateKeyFromPem(privateKey);
  const verifier = forge.pki.publicKeyFromPem(publicKey);
  const digest = forge.md.sha256.create().update('security regression').digest().getBytes();
  const { asn1 } = forge;
  const node = (type, constructed, value) =>
    asn1.create(asn1.Class.UNIVERSAL, type, constructed, value);
  for (const withNull of [false, true]) {
    const algorithm = [
      node(asn1.Type.OID, false, asn1.oidToDer(forge.pki.oids.sha256).getBytes()),
    ];
    if (withNull) algorithm.push(node(asn1.Type.NULL, false, ''));
    const info = node(asn1.Type.SEQUENCE, true, [
      node(asn1.Type.SEQUENCE, true, algorithm),
      node(asn1.Type.OCTETSTRING, false, digest),
    ]);
    const signature = () => signer.sign(asn1.toDer(info).getBytes(), 'NONE');
    assert.equal(verifier.verify(digest, signature()), true);
    info.value[0].value.push(node(asn1.Type.OCTETSTRING, false, 'attacker-controlled garbage'));
    assert.throws(() => verifier.verify(digest, signature()), /valid RSASSA-PKCS1-v1_5/);
  }
});

test('shell-quote rejects injected newlines after comments', () => {
  const { value: shell } = dependency('shell-quote', '1.12.0');
  for (const newline of ['\n', '\r', '\u2028', '\u2029']) {
    assert.throws(() => shell.quote(['echo', 'ok', { comment: 'x' }, `a${newline}id;#`]), TypeError);
  }
  assert.deepEqual(shell.parse(shell.quote(['echo', 'hello world'])), ['echo', 'hello world']);
});

test('xcode uses CommonJS UUID with bounds checks', () => {
  const { value: xcode, require } = dependency('xcode', '3.0.1');
  const uuid = require('uuid');
  const project = xcode.project('test.pbxproj');
  project.hash = { project: { objects: {} } };
  assert.match(project.generateUuid(), /^[\dA-F]{24}$/);
  assert.match(uuid.v4(), /^[\da-f-]{36}$/);
  for (const method of [uuid.v3, uuid.v5]) {
    assert.throws(() => method('x', uuid.v5.DNS, new Uint8Array(8), 4), RangeError);
  }
});

test('fast-uri normalizes percent-encoded scheme-relative hosts', () => {
  const { value: uri } = dependency('fast-uri', '3.1.8');
  assert.equal(uri.parse('//%41.com').host, 'a.com');
  assert.equal(uri.equal('//%41.com', '//a.com'), true);
});

test('patched query-string uses the fixed decoder without changing its CommonJS API', () => {
  const { value: query, require } = dependency('query-string', '7.1.3', true);
  const decode = require('decode-uri-component').default;
  assert.equal(decode('hello%20world'), 'hello world');
  assert.equal(decode('%E0%A4%A'), '%E0%A4%A');
  assert.doesNotThrow(() => decode('%E0%A4%A'.repeat(2000)));
  assert.deepEqual({ ...query.parse('name=hello%20world&tag=a&tag=b') }, {
    name: 'hello world', tag: ['a', 'b'],
  });
  assert.equal(query.stringify({ name: 'hello world' }), 'name=hello%20world');
  assert.equal(query.parse('x=%E0%A4%A').x, '%E0%A4%A');
});

test('source-map-js round-trips normal maps and handles huge indexed offsets', () => {
  const { value: { SourceMapGenerator, SourceMapConsumer, SourceNode } } = dependency('source-map-js', '1.2.2');
  const map = new SourceMapGenerator({ file: 'output.js' });
  map.addMapping({
    generated: { line: 1, column: 0 }, original: { line: 2, column: 0 }, source: 'input.ts',
  });
  map.setSourceContent('input.ts', '\nx');
  const consumer = new SourceMapConsumer(map.toJSON());
  assert.equal(consumer.originalPositionFor({ line: 1, column: 0 }).line, 2);
  assert.throws(() => new SourceMapConsumer({
    version: 3,
    sections: [{ offset: { line: 1e12, column: 0 }, map: map.toJSON() }],
  }), /Section offset line must not exceed/);
  const indexed = new SourceMapConsumer({
    version: 3,
    sections: [{ offset: { line: 10000000, column: 0 }, map: map.toJSON() }],
  });
  assert.equal(SourceNode.fromStringWithSourceMap('x', indexed).toString(), 'x');
});
