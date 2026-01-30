/**
 * Technical Indicators Library
 * Provides common technical analysis indicators for strategy use
 */

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
}

export class Indicators {
  private candles: Candle[];

  constructor(candles: Candle[]) {
    this.candles = candles;
  }

  /**
   * Simple Moving Average
   * @param period - Number of periods for the SMA
   * @returns Array of SMA values
   */
  sma(period: number): number[] {
    const result: number[] = [];
    for (let i = period - 1; i < this.candles.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += this.candles[i - j].close;
      }
      result.push(sum / period);
    }
    return result;
  }

  /**
   * Exponential Moving Average
   * @param period - Number of periods for the EMA
   * @returns Array of EMA values
   */
  ema(period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    
    // Start with SMA for the first EMA value
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += this.candles[i].close;
    }
    let ema = sum / period;
    result.push(ema);
    
    // Calculate subsequent EMA values
    for (let i = period; i < this.candles.length; i++) {
      ema = (this.candles[i].close - ema) * multiplier + ema;
      result.push(ema);
    }
    
    return result;
  }

  /**
   * Relative Strength Index
   * @param period - Number of periods for RSI (default 14)
   * @returns RSI value (0-100)
   */
  rsi(period: number = 14): number {
    if (this.candles.length < period + 1) {
      return 50; // Neutral if not enough data
    }

    let gains = 0;
    let losses = 0;

    // Calculate initial average gain/loss
    for (let i = this.candles.length - period; i < this.candles.length; i++) {
      const change = this.candles[i].close - this.candles[i - 1].close;
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    // Calculate RSI
    if (avgLoss === 0) {
      return 100;
    }
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  /**
   * MACD (Moving Average Convergence Divergence)
   * @param fastPeriod - Fast EMA period (default 12)
   * @param slowPeriod - Slow EMA period (default 26)
   * @param signalPeriod - Signal line EMA period (default 9)
   * @returns MACD object with macd, signal, and histogram values
   */
  macd(fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): { macd: number; signal: number; histogram: number } {
    const fastEMA = this.ema(fastPeriod);
    const slowEMA = this.ema(slowPeriod);
    
    // Calculate MACD line
    const macdLine: number[] = [];
    const offset = slowPeriod - fastPeriod;
    
    for (let i = 0; i < fastEMA.length - offset; i++) {
      macdLine.push(fastEMA[i + offset] - slowEMA[i]);
    }
    
    // Calculate Signal line (EMA of MACD)
    const signalLine = this.calculateEMAFromArray(macdLine, signalPeriod);
    
    // Get latest values
    const macd = macdLine[macdLine.length - 1] || 0;
    const signal = signalLine[signalLine.length - 1] || 0;
    const histogram = macd - signal;
    
    return { macd, signal, histogram };
  }

  /**
   * Bollinger Bands
   * @param period - Period for SMA and standard deviation (default 20)
   * @param stdDev - Number of standard deviations (default 2)
   * @returns Bollinger Bands object with upper, middle, and lower values
   */
  bb(period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } {
    const smaValues = this.sma(period);
    
    if (smaValues.length === 0) {
      return { upper: 0, middle: 0, lower: 0 };
    }
    
    const middle = smaValues[smaValues.length - 1];
    
    // Calculate standard deviation
    let sum = 0;
    const startIndex = this.candles.length - period;
    for (let i = startIndex; i < this.candles.length; i++) {
      sum += Math.pow(this.candles[i].close - middle, 2);
    }
    const stdDevValue = Math.sqrt(sum / period);
    
    const upper = middle + (stdDev * stdDevValue);
    const lower = middle - (stdDev * stdDevValue);
    
    return { upper, middle, lower };
  }

  /**
   * Average True Range
   * @param period - Period for ATR (default 14)
   * @returns ATR value
   */
  atr(period: number = 14): number {
    if (this.candles.length < period + 1) {
      return 0;
    }

    const trueRanges: number[] = [];
    
    for (let i = 1; i < this.candles.length; i++) {
      const high = this.candles[i].high;
      const low = this.candles[i].low;
      const prevClose = this.candles[i - 1].close;
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }
    
    // Calculate ATR using simple average of last 'period' true ranges
    const recentTR = trueRanges.slice(-period);
    const sum = recentTR.reduce((a, b) => a + b, 0);
    
    return sum / period;
  }

  /**
   * Stochastic Oscillator
   * @param kPeriod - %K period (default 14)
   * @param dPeriod - %D period (default 3)
   * @param smooth - Smoothing period (default 3)
   * @returns Stochastic values with %K and %D
   */
  stoch(kPeriod: number = 14, dPeriod: number = 3, smooth: number = 3): { k: number; d: number } {
    if (this.candles.length < kPeriod) {
      return { k: 50, d: 50 };
    }

    const kValues: number[] = [];
    
    for (let i = kPeriod - 1; i < this.candles.length; i++) {
      let highestHigh = -Infinity;
      let lowestLow = Infinity;
      
      for (let j = 0; j < kPeriod; j++) {
        highestHigh = Math.max(highestHigh, this.candles[i - j].high);
        lowestLow = Math.min(lowestLow, this.candles[i - j].low);
      }
      
      const k = ((this.candles[i].close - lowestLow) / (highestHigh - lowestLow)) * 100;
      kValues.push(k);
    }
    
    // Smooth %K
    const smoothedK = this.calculateSMAFromArray(kValues.slice(-smooth));
    
    // Calculate %D (SMA of %K)
    const d = this.calculateSMAFromArray(kValues.slice(-dPeriod));
    
    return { k: smoothedK, d };
  }

  /**
   * Commodity Channel Index
   * @param period - Period for CCI (default 20)
   * @returns CCI value
   */
  cci(period: number = 20): number {
    if (this.candles.length < period) {
      return 0;
    }

    const typicalPrices: number[] = [];
    for (let i = this.candles.length - period; i < this.candles.length; i++) {
      typicalPrices.push((this.candles[i].high + this.candles[i].low + this.candles[i].close) / 3);
    }
    
    const smaTP = typicalPrices.reduce((a, b) => a + b, 0) / period;
    
    // Calculate mean deviation
    let sumDeviation = 0;
    for (const tp of typicalPrices) {
      sumDeviation += Math.abs(tp - smaTP);
    }
    const meanDeviation = sumDeviation / period;
    
    const lastTP = typicalPrices[typicalPrices.length - 1];
    const cci = (lastTP - smaTP) / (0.015 * meanDeviation);
    
    return cci;
  }

  /**
   * Williams %R
   * @param period - Period for Williams %R (default 14)
   * @returns Williams %R value (-100 to 0)
   */
  williamsR(period: number = 14): number {
    if (this.candles.length < period) {
      return -50;
    }

    let highestHigh = -Infinity;
    let lowestLow = Infinity;
    
    for (let i = this.candles.length - period; i < this.candles.length; i++) {
      highestHigh = Math.max(highestHigh, this.candles[i].high);
      lowestLow = Math.min(lowestLow, this.candles[i].low);
    }
    
    const lastClose = this.candles[this.candles.length - 1].close;
    const williamsR = ((highestHigh - lastClose) / (highestHigh - lowestLow)) * -100;
    
    return williamsR;
  }

  /**
   * Parabolic SAR
   * @param step - Acceleration factor step (default 0.02)
   * @param max - Maximum acceleration factor (default 0.2)
   * @returns Parabolic SAR value
   */
  parabolicSAR(step: number = 0.02, max: number = 0.2): number {
    if (this.candles.length < 2) {
      return this.candles[0]?.low || 0;
    }

    let isUptrend = this.candles[1].close > this.candles[0].close;
    let sar = isUptrend ? this.candles[0].low : this.candles[0].high;
    let ep = isUptrend ? this.candles[1].high : this.candles[1].low;
    let af = step;

    for (let i = 2; i < this.candles.length; i++) {
      const current = this.candles[i];
      
      if (isUptrend) {
        if (current.low < sar) {
          isUptrend = false;
          sar = ep;
          ep = current.low;
          af = step;
        } else {
          if (current.high > ep) {
            ep = current.high;
            af = Math.min(af + step, max);
          }
          sar = sar + af * (ep - sar);
          sar = Math.min(sar, this.candles[i - 1].low, current.low);
        }
      } else {
        if (current.high > sar) {
          isUptrend = true;
          sar = ep;
          ep = current.high;
          af = step;
        } else {
          if (current.low < ep) {
            ep = current.low;
            af = Math.min(af + step, max);
          }
          sar = sar + af * (ep - sar);
          sar = Math.max(sar, this.candles[i - 1].high, current.high);
        }
      }
    }

    return sar;
  }

  /**
   * Ichimoku Cloud
   * @returns Ichimoku components: tenkan, kijun, senkouA, senkouB, chikou
   */
  ichimoku(): { tenkan: number; kijun: number; senkouA: number; senkouB: number; chikou: number } {
    const tenkanPeriod = 9;
    const kijunPeriod = 26;
    const senkouBPeriod = 52;

    // Tenkan-sen (Conversion Line)
    let tenkanHigh = -Infinity;
    let tenkanLow = Infinity;
    for (let i = this.candles.length - tenkanPeriod; i < this.candles.length; i++) {
      tenkanHigh = Math.max(tenkanHigh, this.candles[i].high);
      tenkanLow = Math.min(tenkanLow, this.candles[i].low);
    }
    const tenkan = (tenkanHigh + tenkanLow) / 2;

    // Kijun-sen (Base Line)
    let kijunHigh = -Infinity;
    let kijunLow = Infinity;
    for (let i = this.candles.length - kijunPeriod; i < this.candles.length; i++) {
      kijunHigh = Math.max(kijunHigh, this.candles[i].high);
      kijunLow = Math.min(kijunLow, this.candles[i].low);
    }
    const kijun = (kijunHigh + kijunLow) / 2;

    // Senkou Span A (Leading Span A)
    const senkouA = (tenkan + kijun) / 2;

    // Senkou Span B (Leading Span B)
    let senkouBHigh = -Infinity;
    let senkouBLow = Infinity;
    for (let i = this.candles.length - senkouBPeriod; i < this.candles.length; i++) {
      senkouBHigh = Math.max(senkouBHigh, this.candles[i].high);
      senkouBLow = Math.min(senkouBLow, this.candles[i].low);
    }
    const senkouB = (senkouBHigh + senkouBLow) / 2;

    // Chikou Span (Lagging Span)
    const chikou = this.candles[this.candles.length - 1].close;

    return { tenkan, kijun, senkouA, senkouB, chikou };
  }

  /**
   * Average Directional Index
   * @param period - Period for ADX (default 14)
   * @returns ADX components: adx, diPlus, diMinus
   */
  adx(period: number = 14): { adx: number; diPlus: number; diMinus: number } {
    if (this.candles.length < period * 2) {
      return { adx: 0, diPlus: 0, diMinus: 0 };
    }

    const plusDM: number[] = [];
    const minusDM: number[] = [];
    const tr: number[] = [];

    for (let i = 1; i < this.candles.length; i++) {
      const high = this.candles[i].high;
      const low = this.candles[i].low;
      const prevHigh = this.candles[i - 1].high;
      const prevLow = this.candles[i - 1].low;
      const prevClose = this.candles[i - 1].close;

      const upMove = high - prevHigh;
      const downMove = prevLow - low;

      if (upMove > downMove && upMove > 0) {
        plusDM.push(upMove);
      } else {
        plusDM.push(0);
      }

      if (downMove > upMove && downMove > 0) {
        minusDM.push(downMove);
      } else {
        minusDM.push(0);
      }

      const trueRange = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      tr.push(trueRange);
    }

    // Calculate smoothed values
    const smoothedPlusDM = this.calculateSMAFromArray(plusDM.slice(0, period));
    const smoothedMinusDM = this.calculateSMAFromArray(minusDM.slice(0, period));
    const smoothedTR = this.calculateSMAFromArray(tr.slice(0, period));

    const diPlus = (smoothedPlusDM / smoothedTR) * 100;
    const diMinus = (smoothedMinusDM / smoothedTR) * 100;

    const dx = (Math.abs(diPlus - diMinus) / (diPlus + diMinus)) * 100;
    
    // ADX is the smoothed DX
    const adx = dx; // Simplified - in practice would smooth over multiple periods

    return { adx, diPlus, diMinus };
  }

  /**
   * Momentum
   * @param period - Period for momentum (default 10)
   * @returns Array of momentum values
   */
  momentum(period: number = 10): number[] {
    const result: number[] = [];
    
    for (let i = period; i < this.candles.length; i++) {
      result.push(this.candles[i].close - this.candles[i - period].close);
    }
    
    return result;
  }

  /**
   * Fibonacci Retracement Levels
   * @param high - High price
   * @param low - Low price
   * @returns Fibonacci levels and retracements
   */
  fibonacci(high: number, low: number): { levels: number[]; retracements: Record<string, number> } {
    const diff = high - low;
    
    const levels = [
      high,
      high - (diff * 0.236), // 23.6%
      high - (diff * 0.382), // 38.2%
      high - (diff * 0.5),   // 50%
      high - (diff * 0.618), // 61.8%
      low
    ];
    
    const retracements = {
      '23.6%': high - (diff * 0.236),
      '38.2%': high - (diff * 0.382),
      '50%': high - (diff * 0.5),
      '61.8%': high - (diff * 0.618),
      '78.6%': high - (diff * 0.786),
    };
    
    return { levels, retracements };
  }

  /**
   * Pivot Points
   * @returns Pivot point and support/resistance levels
   */
  pivotPoints(): { r3: number; r2: number; r1: number; pivot: number; s1: number; s2: number; s3: number } {
    if (this.candles.length < 1) {
      return { r3: 0, r2: 0, r1: 0, pivot: 0, s1: 0, s2: 0, s3: 0 };
    }

    const last = this.candles[this.candles.length - 1];
    const high = last.high;
    const low = last.low;
    const close = last.close;

    const pivot = (high + low + close) / 3;
    const r1 = (2 * pivot) - low;
    const s1 = (2 * pivot) - high;
    const r2 = pivot + (high - low);
    const s2 = pivot - (high - low);
    const r3 = high + (2 * (pivot - low));
    const s3 = low - (2 * (high - pivot));

    return { r3, r2, r1, pivot, s1, s2, s3 };
  }

  // Helper methods
  private calculateEMAFromArray(values: number[], period: number): number[] {
    const result: number[] = [];
    const multiplier = 2 / (period + 1);
    
    let ema = values[0];
    result.push(ema);
    
    for (let i = 1; i < values.length; i++) {
      ema = (values[i] - ema) * multiplier + ema;
      result.push(ema);
    }
    
    return result;
  }

  private calculateSMAFromArray(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}

/**
 * Create indicators instance from candle data
 */
export function createIndicators(candles: Candle[]): Indicators {
  return new Indicators(candles);
}
