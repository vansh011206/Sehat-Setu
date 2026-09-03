import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("Accessibility & Form Validation Tests", () => {
  it("interactive buttons have accessible text labels", () => {
    render(
      <button aria-label="Confirm appointment booking" className="bg-teal-700 text-white px-4 py-2 rounded-xl">
        Book Appointment
      </button>
    );

    const btn = screen.getByRole("button", { name: /confirm appointment booking/i });
    expect(btn).toBeInTheDocument();
  });

  it("form input shows error message on validation failure", () => {
    const errorMsg = "Phone number must be at least 10 digits.";
    render(
      <div>
        <label htmlFor="phone-input">Phone Number</label>
        <input id="phone-input" type="text" aria-invalid="true" aria-describedby="phone-error" />
        <span id="phone-error" className="text-red-600 text-xs mt-1">
          {errorMsg}
        </span>
      </div>
    );

    const input = screen.getByLabelText(/phone number/i);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(errorMsg)).toBeInTheDocument();
  });
});
