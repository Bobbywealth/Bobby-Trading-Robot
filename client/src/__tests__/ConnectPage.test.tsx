import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import ConnectPage from "../pages/ConnectPage";

const toastSpy = vi.fn();

const statusMock = vi.fn();
const connectHookMock = vi.fn();
const selectAccountHookMock = vi.fn();
const disconnectHookMock = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastSpy }),
}));

vi.mock("@/components/trading/Sidebar", () => ({
  Sidebar: () => <div data-testid="sidebar" />,
}));

vi.mock("@/components/ui/select", () => {
  const React = require("react");
  const SelectContext = React.createContext<{ onValueChange?: (v: string) => void }>({});

  const Select = ({ onValueChange, children }: any) => (
    <SelectContext.Provider value={{ onValueChange }}>
      <div>{children}</div>
    </SelectContext.Provider>
  );

  const SelectTrigger = ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  );

  const SelectContent = ({ children }: any) => <div>{children}</div>;

  const SelectItem = ({ value, children, ...props }: any) => {
    const ctx = React.useContext(SelectContext);
    return (
      <div role="option" onClick={() => ctx.onValueChange?.(value)} {...props}>
        {children}
      </div>
    );
  };

  const SelectValue = ({ placeholder }: any) => <span>{placeholder}</span>;

  return { Select, SelectTrigger, SelectContent, SelectItem, SelectValue };
});

vi.mock("@/lib/api", () => ({
  useBrokerStatus: () => statusMock(),
  useConnectBroker: () => connectHookMock(),
  useSelectBrokerAccount: () => selectAccountHookMock(),
  useDisconnectBroker: () => disconnectHookMock(),
}));

vi.mock(
  "@assets/generated_images/dark_futuristic_digital_trading_background_with_neon_data_streams.png",
  () => ({ default: "image.png" }),
);

describe("ConnectPage", () => {
  beforeEach(() => {
    toastSpy.mockReset();
    statusMock.mockReset();
    connectHookMock.mockReset();
    selectAccountHookMock.mockReset();
    disconnectHookMock.mockReset();
  });

  it("shows connect form and validates missing fields", async () => {
    statusMock.mockReturnValue({ data: { connected: false }, isLoading: false });
    connectHookMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    selectAccountHookMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    disconnectHookMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<ConnectPage />);

    const connectButton = screen.getByTestId("button-connect");
    fireEvent.click(connectButton);

    expect(toastSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Missing fields" }),
    );
  });

  it("connects and moves to account selection", async () => {
    const user = userEvent.setup();
    statusMock.mockReturnValue({ data: { connected: false }, isLoading: false });
    const mutateConnect = vi.fn().mockResolvedValue({
      success: true,
      accounts: [
        { id: 1, name: "Main", accNum: 123, currency: "USD", balance: 1000, equity: 1100 },
      ],
    });
    connectHookMock.mockReturnValue({
      mutateAsync: mutateConnect,
      isPending: false,
    });
    const mutateSelect = vi.fn().mockResolvedValue({});
    selectAccountHookMock.mockReturnValue({
      mutateAsync: mutateSelect,
      isPending: false,
    });
    disconnectHookMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<ConnectPage />);

    await user.type(screen.getByTestId("input-email"), "user@example.com");
    await user.type(screen.getByTestId("input-password"), "secret");
    await user.click(screen.getByTestId("button-connect"));

    expect(mutateConnect).toHaveBeenCalledWith({
      email: "user@example.com",
      password: "secret",
      server: "live.tradelocker.com",
    });

    expect(await screen.findByText(/Select Trading Account/i)).toBeInTheDocument();

    await user.click(screen.getByTestId("select-account"));
    await user.click(screen.getByText(/Main/));
    await user.click(screen.getByTestId("button-select-account"));

    expect(mutateSelect).toHaveBeenCalledWith({
      accountId: "1",
      accountNumber: 123,
    });
  });

  it("disconnects when already connected", async () => {
    const user = userEvent.setup();
    statusMock.mockReturnValue({
      data: {
        connected: true,
        email: "user@example.com",
        server: "demo",
        accountNumber: "123",
        lastConnected: new Date().toISOString(),
      },
      isLoading: false,
    });

    const mutateDisconnect = vi.fn().mockResolvedValue({});
    disconnectHookMock.mockReturnValue({
      mutateAsync: mutateDisconnect,
      isPending: false,
    });
    connectHookMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    selectAccountHookMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });

    render(<ConnectPage />);

    await user.click(screen.getByTestId("button-disconnect"));
    expect(mutateDisconnect).toHaveBeenCalled();
  });
});

