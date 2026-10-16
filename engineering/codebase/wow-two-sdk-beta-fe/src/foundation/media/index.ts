export { canCaptureMedia, getMediaSupport, type MediaSupport } from './CanCaptureMedia';

export { type MediaStreamRequestResult, type MediaStreamStatus, type MediaStreamFailure } from './MediaStreamMapping';

export { requestMediaStream, requestCameraStream, requestMicrophoneStream } from './RequestMediaStream';

export { listMediaDevices, hasCamera, hasMicrophone, type MediaDeviceGroups } from './ListMediaDevices';

export { stopMediaStream } from './StopMediaStream';

export { facingModeConstraints, switchCamera, type FacingMode, type FacingModeOptions } from './FacingMode';

export { getCameraPermission, getMicrophonePermission, type PermissionQueryState } from './MediaPermission';

export {
  useMediaStream,
  type MediaStreamControls,
  type MediaStreamState,
  type UseMediaStreamOptions,
} from './UseMediaStream';

export { MediaStreamFailureCode } from './MediaStreamFailureCode';
