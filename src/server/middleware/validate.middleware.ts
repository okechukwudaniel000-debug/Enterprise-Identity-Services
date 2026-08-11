import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";
import { ValidationError } from "../errors/custom-errors";

export const validateRequest = (
  schema: AnyZodObject,
  target: "body" | "query" | "params" | "cookies" = "body"
) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req[target]);
      // Replace the target object with the validated and fully typed schema values
      req[target] = parsed;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Map through errors to produce a structured developer-friendly field mapping
        const formattedErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));
        next(new ValidationError("Request payload validation failed.", formattedErrors));
      } else {
        next(error);
      }
    }
  };
};
