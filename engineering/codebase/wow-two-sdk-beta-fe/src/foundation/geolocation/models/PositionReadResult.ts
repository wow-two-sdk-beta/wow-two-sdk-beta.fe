import type { Result } from '../../results';
import type { Position } from './Coordinates';
import type { PositionFailure } from './PositionFailure';

/** The completed operation, carrying either its value or its typed failure. */
export type PositionReadResult = Result<Position, PositionFailure>;
