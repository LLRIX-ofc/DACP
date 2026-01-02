const axios = require("axios");
const { extract } = require("./dmap");

class DACPClient {
  constructor(host, log) {
    this.host = host;
    this.log = log;
    this.sessionId = null;
    this.login();
  }

  headers(path) {
    return {
      "User-Agent": "Remote/1060",
      "Client-DAAP-Version": "3.13",
      "Client-iTunes-Sharing-Version": "3.15",
      "Viewer-Only-Client": "1"
    };
  }

  async login() {
    const r = await axios.get(
      `http://${this.host}:3689/login?pairing-guid=0x0000000000000000&hasFP=1`,
      { headers: this.headers() }
    );

    this.sessionId = extract(r.data, "mlid");
    this.log(`DACP session ${this.sessionId}`);
  }

  async cmd(path) {
    return axios.get(
      `http://${this.host}:3689${path}?session-id=${this.sessionId}`,
      { headers: this.headers(path) }
    );
  }

  play() { return this.cmd("/ctrl-int/1/play"); }
  pause() { return this.cmd("/ctrl-int/1/pause"); }
  next() { return this.cmd("/ctrl-int/1/nextitem"); }
  previous() { return this.cmd("/ctrl-int/1/previtem"); }

  setVolume(v) {
    return this.cmd(`/ctrl-int/1/setproperty?dmcp.volume=${v}`);
  }

  seekPercent(p) {
    return this.cmd(`/ctrl-int/1/setproperty?dacp.playingtime=${p}`);
  }

  async nowPlaying() {
    const r = await this.cmd("/ctrl-int/1/playstatusupdate?revision-number=1");
    const d = r.data;
    return {
      title: extract(d, "cann"),
      artist: extract(d, "cana"),
      album: extract(d, "canl"),
      position: extract(d, "cant") || 0,
      duration: extract(d, "cast") || 1
    };
  }

  async queue() {
    const r = await this.cmd("/ctrl-int/1/playqueue-contents?span=5");
    const d = r.data;

    const titles = extract(d, "ceQn", true);
    const artists = extract(d, "ceQr", true);
    const albums = extract(d, "ceQa", true);

    return titles.map((t, i) => ({
      title: t,
      artist: artists[i],
      album: albums[i]
    }));
  }
}

module.exports = { DACPClient };
