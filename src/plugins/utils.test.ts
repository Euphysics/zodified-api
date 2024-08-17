import { describe, expect, it } from "vitest";
import { getFormDataStream } from "./utils";

describe("getFormDataStream", () => {
  it("should convert object to FormData", () => {
    const mockData = {
      key1: "value1",
      key2: new Blob(["blob content"], { type: "text/plain" }),
    };

    const { data: formData } = getFormDataStream(mockData);

    expect(formData).toBeInstanceOf(FormData);
    expect(formData.get("key1")).toBe("value1");

    const blob = formData.get("key2") as Blob;
    expect(blob).toBeInstanceOf(Blob);

    const reader = new FileReader();
    reader.onload = () => {
      expect(reader.result).toBe("blob content");
    };
    reader.readAsText(blob);
  });

  it("should handle empty object", () => {
    const { data: formData } = getFormDataStream({});

    expect(formData).toBeInstanceOf(FormData);
    expect(Array.from(formData.keys()).length).toBe(0);
  });

  it("should handle special characters in keys and values", () => {
    const mockData = {
      "key@#1": "value$%^&",
      "key(2)": new Blob(["special content"], { type: "text/plain" }),
    };

    const { data: formData } = getFormDataStream(mockData);

    expect(formData.get("key@#1")).toBe("value$%^&");

    const blob = formData.get("key(2)") as Blob;
    expect(blob).toBeInstanceOf(Blob);

    const reader = new FileReader();
    reader.onload = () => {
      expect(reader.result).toBe("special content");
    };
    reader.readAsText(blob);
  });
});
