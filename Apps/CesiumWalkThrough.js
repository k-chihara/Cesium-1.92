'use strict';

Cesium.WalkThrough = (function () {
  const Cartesian3 = Cesium.Cartesian3;

  // 目線の高さ
  const HUMAN_EYE_HEIGHT = 1.65;

  function CesiumWalkThrough(options) {
    // ウォークスルーモード
    this._mode = false;
    // CesiumViewer
    this._cesiumViewer = options.cesiumViewer;
    // CesiumViewer.camera
    this._camera = this._cesiumViewer.camera;
    // canvas
    this._canvas = this._cesiumViewer.canvas;

    // イベントハンドラ設定
    this._connectEventHandlers();
  }

  // 親クラスのイベントハンドラ関連付け
  CesiumWalkThrough.prototype._connectEventHandlers = function () {
    this._disconectOnClockTick = this._cesiumViewer.clock.onTick.addEventListener(
      CesiumWalkThrough.prototype._onClockTick,
      this
    );
  };

  // Entityより取得できる座標
  //let scratchDeltaPosition = new Cartesian3();
  let scratchNextPosition = new Cartesian3();
  let scratchNextCartographic = new Cesium.Cartographic();
  let scratchTerrainConsideredNextPosition = new Cartesian3();

  // onTickイベント(カメラ座標、向き更新)
  CesiumWalkThrough.prototype._onClockTick = function (clock) {
    if (!this._enabled) return;

    let currentCameraPosition = this._camera.position;

    let scratchDeltaPosition = this._entitiy.position.getValue(clock.currentTime);

    Cartesian3.add(currentCameraPosition, scratchDeltaPosition, scratchNextPosition);

    // consider terrain height
    let globe = this._cesiumViewer.scene.globe;
    let ellipsoid = globe.ellipsoid;

    // get height for next update position
    ellipsoid.cartesianToCartographic(scratchNextPosition, scratchNextCartographic);

    let height = globe.getHeight(scratchNextCartographic);

    if (height === undefined) {
      console.warn('height is undefined!');
      return;
    }

    if (height < 0) {
      console.warn(`height is negative!`);
    }

    scratchNextCartographic.height = height + HUMAN_EYE_HEIGHT;

    ellipsoid.cartographicToCartesian(
      scratchNextCartographic,
      scratchTerrainConsideredNextPosition
    );

    this._camera.setView({
      destination: scratchTerrainConsideredNextPosition,
      orientation: this._entitiy.orientation.getValue(clock.currentTime),
      endTransform: Cesium.Matrix4.IDENTITY
    });
  };

  // デフォルトの画面イベントの無効化
  CesiumWalkThrough.prototype._enableDefaultScreenSpaceCameraController = function (enabled) {
    const scene = this._cesiumViewer.scene;

    // disable the default event handlers
    scene.screenSpaceCameraController.enableRotate = enabled;
    scene.screenSpaceCameraController.enableTranslate = enabled;
    scene.screenSpaceCameraController.enableZoom = enabled;
    scene.screenSpaceCameraController.enableTilt = enabled;
    scene.screenSpaceCameraController.enableLook = enabled;
  };

  // ウォークスルーモード開始
  CesiumWalkThrough.prototype.start = function (entitiy) {
    this._enabled = true;
    this._enableDefaultScreenSpaceCameraController(false);
    this._entitiy = entitiy;
  };

  // ウォークスルーモード終了
  CesiumWalkThrough.prototype.end = function () {
    this._enabled = false;
    this._enableDefaultScreenSpaceCameraController(true);
    this._entitiy = null;
  };
  return CesiumWalkThrough;
})();
