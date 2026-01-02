function extract(buf, tag, all = false) {
  const out = [];
  let i = 0;
  const t = Buffer.from(tag);

  while ((i = buf.indexOf(t, i)) !== -1) {
    const len = buf.readUInt32BE(i + 4);
    const val = buf.slice(i + 8, i + 8 + len).toString("utf8");
    out.push(val);
    i += 8 + len;
    if (!all) return val;
  }
  return all ? out : null;
}

module.exports = { extract };
