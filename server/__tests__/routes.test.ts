import express from "express";
import { createServer } from "http";
import request from "supertest";
import { describe, expect, beforeEach, it, vi } from "vitest";
import { registerRoutes } from "../routes";

const storageMock = vi.hoisted(() => ({
  createStrategy: vi.fn(),
  getStrategies: vi.fn(),
  getStrategy: vi.fn(),
  updateStrategy: vi.fn(),
  deleteStrategy: vi.fn(),
  getRiskConfig: vi.fn(),
  upsertRiskConfig: vi.fn(),
  getTrades: vi.fn(),
  createTrade: vi.fn(),
  updateTrade: vi.fn(),
  getSystemLogs: vi.fn(),
  createSystemLog: vi.fn(),
  getBacktestResults: vi.fn(),
  createBacktestResult: vi.fn(),
  getBrokerCredential: vi.fn(),
  upsertBrokerCredential: vi.fn(),
  updateBrokerCredential: vi.fn(),
  deleteBrokerCredential: vi.fn(),
}));

const tradeLockerMock = vi.hoisted(() => ({
  authenticate: vi.fn(),
  getAccounts: vi.fn(),
  getInstruments: vi.fn(),
  getQuotes: vi.fn(),
  getOpenPositions: vi.fn(),
  placeOrder: vi.fn(),
}));

vi.mock("../storage", () => ({
  storage: storageMock,
}));

vi.mock("../tradelocker", () => ({
  createTradeLockerService: vi.fn(() => tradeLockerMock),
  getTradeLockerService: vi.fn(() => tradeLockerMock),
  initializeTradeLockerService: vi.fn(() => tradeLockerMock),
  clearTradeLockerService: vi.fn(),
}));

const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";

async function setupApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const httpServer = createServer(app);
  await registerRoutes(httpServer, app);
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registerRoutes", () => {
  it("creates a strategy when payload is valid", async () => {
    storageMock.createStrategy.mockResolvedValue({
      id: "s1",
      userId: MOCK_USER_ID,
      name: "Test strategy",
      code: "return 1;",
      parameters: null,
      isActive: false,
      createdAt: new Date(),
    });

    const app = await setupApp();
    const res = await request(app)
      .post("/api/strategies")
      .send({ name: "Test strategy", code: "return 1;" })
      .expect(200);

    expect(storageMock.createStrategy).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: MOCK_USER_ID,
        name: "Test strategy",
        code: "return 1;",
      }),
    );
    expect(res.body).toMatchObject({ id: "s1", name: "Test strategy" });
  });

  it("rejects an invalid strategy payload", async () => {
    const app = await setupApp();

    await request(app)
      .post("/api/strategies")
      .send({ code: "return 1;" })
      .expect(400);

    expect(storageMock.createStrategy).not.toHaveBeenCalled();
  });

  it("connects to broker and returns accounts", async () => {
    tradeLockerMock.authenticate.mockResolvedValue({
      accessToken: "token",
      refreshToken: "refresh",
      expiresIn: 3600,
    });
    tradeLockerMock.getAccounts.mockResolvedValue([
      {
        id: 1,
        name: "Main",
        accNum: 123,
        currency: "USD",
        accountBalance: 1000,
        accountEquity: 1100,
      },
    ]);
    storageMock.upsertBrokerCredential.mockResolvedValue({
      id: "cred1",
      userId: MOCK_USER_ID,
      broker: "tradelocker",
      email: "user@example.com",
      server: "demo",
      accessToken: "token",
      refreshToken: "refresh",
      accountId: null,
      accountNumber: null,
      isConnected: true,
      lastConnected: new Date(),
    });

    const app = await setupApp();
    const res = await request(app)
      .post("/api/broker/connect")
      .send({ email: "user@example.com", password: "secret", server: "demo" })
      .expect(200);

    expect(tradeLockerMock.authenticate).toHaveBeenCalledWith(
      "user@example.com",
      "secret",
      "demo",
    );
    expect(storageMock.upsertBrokerCredential).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: MOCK_USER_ID,
        email: "user@example.com",
        server: "demo",
        isConnected: true,
      }),
    );
    expect(res.body).toMatchObject({
      success: true,
      accounts: [
        {
          id: 1,
          name: "Main",
          accNum: 123,
          currency: "USD",
          balance: 1000,
          equity: 1100,
        },
      ],
    });
  });

  it("fetches instruments, quotes, positions, and places order", async () => {
    storageMock.getBrokerCredential.mockResolvedValue({
      id: "c1",
      userId: MOCK_USER_ID,
      broker: "tradelocker",
      email: "user@example.com",
      server: "demo",
      accessToken: "token",
      refreshToken: "refresh",
      accountId: "a1",
      accountNumber: "123",
      isConnected: true,
      lastConnected: new Date(),
    });

    storageMock.getRiskConfig.mockResolvedValue(null);
    tradeLockerMock.getInstruments.mockResolvedValue([
      { tradableInstrumentId: 1, name: "EURUSD", description: "", pipSize: 0.0001, lotSize: 100000, minOrderSize: 0.01, maxOrderSize: 100 },
    ]);
    tradeLockerMock.getQuotes.mockResolvedValue([
      { s: "EURUSD", bid: 1.1, ask: 1.2, timestamp: Date.now() },
    ]);
    tradeLockerMock.getOpenPositions.mockResolvedValue([{ id: 1, symbol: "EURUSD" }]);
    tradeLockerMock.placeOrder.mockResolvedValue({ orderId: 10, status: "submitted" });

    const app = await setupApp();

    await request(app).get("/api/broker/instruments").expect(200);
    await request(app).get("/api/broker/quotes?symbols=EURUSD").expect(200);
    await request(app).get("/api/broker/positions").expect(200);
    await request(app)
      .post("/api/broker/orders")
      .send({ instrumentId: 1, qty: 1, side: "buy", type: "market" })
      .expect(200);

    expect(tradeLockerMock.getInstruments).toHaveBeenCalled();
    expect(tradeLockerMock.getQuotes).toHaveBeenCalledWith(["EURUSD"]);
    expect(tradeLockerMock.getOpenPositions).toHaveBeenCalled();
    expect(tradeLockerMock.placeOrder).toHaveBeenCalledWith(
      expect.objectContaining({ instrumentId: 1, qty: 1, side: "buy", type: "market" }),
    );
  });

  it("returns risk config and upserts it", async () => {
    const riskConfig = {
      id: "r1",
      userId: MOCK_USER_ID,
      maxDailyLossDollar: "1000",
      maxDailyLossPercent: "2",
      maxPositionSize: 5,
      maxLotSize: "1",
      tradingHoursStart: "08:00",
      tradingHoursEnd: "16:00",
      newsFilterEnabled: true,
      assetBlacklist: ["BTCUSD"],
    };
    storageMock.getRiskConfig.mockResolvedValue(riskConfig);
    storageMock.upsertRiskConfig.mockResolvedValue({
      ...riskConfig,
      maxPositionSize: 10,
    });

    const app = await setupApp();

    const getRes = await request(app).get("/api/risk-config").expect(200);
    expect(getRes.body).toMatchObject({ id: "r1", newsFilterEnabled: true });
    expect(storageMock.getRiskConfig).toHaveBeenCalledWith(MOCK_USER_ID);

    await request(app)
      .put("/api/risk-config")
      .send({
        maxDailyLossDollar: "1000",
        maxDailyLossPercent: "2",
        maxPositionSize: 10,
        maxLotSize: "1",
        tradingHoursStart: "08:00",
        tradingHoursEnd: "16:00",
        newsFilterEnabled: true,
        assetBlacklist: ["BTCUSD"],
      })
      .expect(200);

    expect(storageMock.upsertRiskConfig).toHaveBeenCalledWith(
      expect.objectContaining({ userId: MOCK_USER_ID, maxPositionSize: 10 }),
    );
  });

  it("returns trades with limit and rejects invalid trade", async () => {
    storageMock.getTrades.mockResolvedValue([
      { id: "t1", userId: MOCK_USER_ID, symbol: "EURUSD", side: "buy", entryPrice: "1.0", quantity: "1", status: "OPEN", entryTime: new Date(), orderId: null, strategyId: null, exitPrice: null, exitTime: null, pnl: null },
    ]);
    storageMock.createTrade.mockResolvedValue({
      id: "t1",
      userId: MOCK_USER_ID,
      symbol: "EURUSD",
      side: "buy",
      entryPrice: "1.1",
      quantity: "1",
      status: "OPEN",
      entryTime: new Date(),
      orderId: null,
      strategyId: null,
      exitPrice: null,
      exitTime: null,
      pnl: null,
    });

    const app = await setupApp();

    await request(app).get("/api/trades?limit=5").expect(200);
    expect(storageMock.getTrades).toHaveBeenCalledWith(MOCK_USER_ID, 5);

    await request(app)
      .post("/api/trades")
      .send({ symbol: "EURUSD" })
      .expect(400);
  });

  it("returns backtest results filtered by strategy", async () => {
    storageMock.getBacktestResults.mockResolvedValue([
      {
        id: "b1",
        userId: MOCK_USER_ID,
        strategyId: "s1",
        symbol: "EURUSD",
        timeframe: "H1",
        startDate: new Date(),
        endDate: new Date(),
        totalTrades: 10,
        winRate: "0.6",
        totalPnl: "1200",
        maxDrawdown: "200",
        sharpeRatio: "1.5",
        createdAt: new Date(),
      },
    ]);

    const app = await setupApp();
    await request(app)
      .get("/api/backtest?strategyId=s1")
      .expect(200);

    expect(storageMock.getBacktestResults).toHaveBeenCalledWith(
      MOCK_USER_ID,
      "s1",
    );
  });

  it("returns broker status and guards quotes without account", async () => {
    storageMock.getBrokerCredential.mockResolvedValue(undefined);

    const app = await setupApp();
    const statusRes = await request(app).get("/api/broker/status").expect(200);
    expect(statusRes.body).toMatchObject({ connected: false });

    storageMock.getBrokerCredential.mockResolvedValue({
      id: "c1",
      userId: MOCK_USER_ID,
      broker: "tradelocker",
      email: "user@example.com",
      server: "demo",
      accessToken: "token",
      refreshToken: "refresh",
      accountId: null,
      accountNumber: null,
      isConnected: true,
      lastConnected: new Date(),
    });

    await request(app).get("/api/broker/quotes").expect(409);
  });

  it("blocks order when outside trading window or size exceeds limits", async () => {
    const now = new Date();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0));

    storageMock.getBrokerCredential.mockResolvedValue({
      id: "c1",
      userId: MOCK_USER_ID,
      broker: "tradelocker",
      email: "user@example.com",
      server: "demo",
      accessToken: "token",
      refreshToken: "refresh",
      accountId: "a1",
      accountNumber: "123",
      isConnected: true,
      lastConnected: new Date(),
    });

    storageMock.getRiskConfig.mockResolvedValue({
      id: "r1",
      userId: MOCK_USER_ID,
      maxDailyLossDollar: null,
      maxDailyLossPercent: null,
      maxPositionSize: 1,
      maxLotSize: "0.5",
      tradingHoursStart: "08:00",
      tradingHoursEnd: "10:00",
      newsFilterEnabled: false,
      assetBlacklist: [],
    });

    const app = await setupApp();

    const windowRes = await request(app)
      .post("/api/broker/orders")
      .send({ instrumentId: 1, qty: 0.1, side: "buy", type: "market" })
      .expect(409);
    expect(windowRes.body).toMatchObject({ error: "Trading window closed" });

    storageMock.getRiskConfig.mockResolvedValue({
      id: "r1",
      userId: MOCK_USER_ID,
      maxDailyLossDollar: null,
      maxDailyLossPercent: null,
      maxPositionSize: 1,
      maxLotSize: "0.5",
      tradingHoursStart: "00:00",
      tradingHoursEnd: "23:59",
      newsFilterEnabled: false,
      assetBlacklist: [],
    });

    await request(app)
      .post("/api/broker/orders")
      .send({ instrumentId: 1, qty: 2, side: "buy", type: "market" })
      .expect(409);

    vi.useRealTimers();
  });
});

