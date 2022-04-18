'use strict';

Cesium.WalkThrough = (function () {
  // 目線の高さ
  const HUMAN_EYE_HEIGHT = 1.65;
  //const HUMAN_EYE_HEIGHT = 0.1;

  function CesiumWalkThrough(options) {
    // ウォークスルーモード
    this._mode = false;
    // CesiumViewer
    this._cesiumViewer = options.cesiumViewer;
    // CesiumViewer.camera
    this._camera = this._cesiumViewer.camera;

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

  CesiumWalkThrough.prototype._getModelMatrix = function (entity, time, result) {
    const matrix3Scratch = new Cesium.Matrix3();
    const positionScratch = new Cesium.Cartesian3();
    const orientationScratch = new Cesium.Quaternion();

    let position = Cesium.Property.getValueOrUndefined(entity.position, time, positionScratch);

    // consider terrain height
    const globe = this._cesiumViewer.scene.globe;
    const ellipsoid = globe.ellipsoid;

    let cartographic = new Cesium.Cartographic();
    cartographic = ellipsoid.cartesianToCartographic(position);
    const height = globe.getHeight(cartographic);

    if (height === undefined) {
      console.warn('height is undefined!');
      return;
    }

    cartographic.height = height + HUMAN_EYE_HEIGHT;

    position = ellipsoid.cartographicToCartesian(cartographic);

    const orientation = Cesium.Property.getValueOrUndefined(
      entity.orientation,
      time,
      orientationScratch
    );
    if (!Cesium.defined(orientation)) {
      result = Cesium.Transforms.eastNorthUpToFixedFrame(position, undefined, result);
    } else {
      result = Cesium.Matrix4.fromRotationTranslation(
        Cesium.Matrix3.fromQuaternion(orientation, matrix3Scratch),
        position,
        result
      );
    }
    return result;
  };

  // onTickイベント(カメラ座標、向き更新)
  CesiumWalkThrough.prototype._onClockTick = function (clock) {
    if (!this._enabled) return;

    const scratch = new Cesium.Matrix4();

    // 時系列情報が終了した場合
    if (!this._entitiy.position.getValue(clock.currentTime)) {
      return;
    }

    // カメラ座標、高さ、向きを取得
    this._getModelMatrix(this._entitiy, clock.currentTime, scratch);

    // カメラ座標、高さ、向きを設定
    this._camera.lookAtTransform(scratch, new Cesium.Cartesian3(-1, 0, 0));
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
    this._enableDefaultScreenSpaceCameraController(false);
    this._entitiy = entitiy;
    this._entitiy.model.show = false;
    this._enabled = true;
  };

  // ウォークスルーモード終了
  CesiumWalkThrough.prototype.end = function () {
    this._enabled = false;
    this._entitiy.model.show = true;
    this._entitiy = null;
    this._enableDefaultScreenSpaceCameraController(true);
  };
  return CesiumWalkThrough;
})();
