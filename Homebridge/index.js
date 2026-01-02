const { DACPClient } = require("./dacp/client");

module.exports = (homebridge) => {
  const { Service, Characteristic } = homebridge.hap;

  homebridge.registerAccessory(
    "homebridge-dacp-media",
    "DACP Media Player",
    class DACPMediaAccessory {
      constructor(log, config) {
        this.log = log;
        this.config = config;

        this.client = new DACPClient(config.host, log);

        /* ---------- Services ---------- */

        // Play / Pause
        this.switchService = new Service.Switch("Play / Pause");
        this.switchService.getCharacteristic(Characteristic.On)
          .onSet(v => v ? this.client.play() : this.client.pause());

        // Volume (Speaker)
        this.speakerService = new Service.Speaker("Volume");
        this.speakerService.getCharacteristic(Characteristic.Volume)
          .onSet(v => this.client.setVolume(v));

        // Track progress (fake scrubber)
        this.progressService = new Service.Lightbulb("Track Progress");
        this.progressService.getCharacteristic(Characteristic.Brightness)
          .onSet(v => this.client.seekPercent(v));

        // Now Playing info
        this.infoService = new Service.AccessoryInformation()
          .setCharacteristic(Characteristic.Manufacturer, "Apple")
          .setCharacteristic(Characteristic.Model, "iTunes DACP")
          .setCharacteristic(Characteristic.SerialNumber, "DACP-REMOTE");

        // Album artwork (camera snapshot trick)
        this.cameraService = new Service.CameraRTPStreamManagement("Album Art");

        // Queue preview (5 switches)
        this.queueServices = [];
        for (let i = 0; i < 5; i++) {
          const s = new Service.Switch(`Queue ${i + 1}`);
          s.getCharacteristic(Characteristic.On).onGet(() => false);
          this.queueServices.push(s);
        }

        /* ---------- Update Loop ---------- */

        setInterval(async () => {
          const np = await this.client.nowPlaying();
          if (!np) return;

          this.infoService
            .setCharacteristic(Characteristic.Name, np.title)
            .setCharacteristic(Characteristic.Model, np.artist)
            .setCharacteristic(Characteristic.SerialNumber, np.album);

          this.progressService
            .updateCharacteristic(
              Characteristic.Brightness,
              Math.floor(np.position / np.duration * 100)
            );

          const queue = await this.client.queue();
          queue.slice(0, 5).forEach((q, i) => {
            this.queueServices[i]
              .setCharacteristic(Characteristic.Name, q.title);
          });
        }, 2000);
      }

      getServices() {
        return [
          this.infoService,
          this.switchService,
          this.speakerService,
          this.progressService,
          this.cameraService,
          ...this.queueServices
        ];
      }
    }
  );
};
