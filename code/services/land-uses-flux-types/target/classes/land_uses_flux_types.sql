-- ------------------------------------------------------------
-- Create Table
-- ------------------------------------------------------------
CREATE TABLE land_use_flux_type (
    id SERIAL UNIQUE PRIMARY KEY NOT NULL,
    land_use_category_id INTEGER NOT NULL,
    flux_type_id INTEGER NOT NULL,
    version INTEGER NOT NULL);


-- ------------------------------------------------------------
-- Add Version Initialization Trigger for all insert operations
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION LandUseFluxTypeVersionInitializationFunction()
RETURNS "trigger" AS
$$
BEGIN
  New.version:=1;
  Return NEW;
END
$$
LANGUAGE 'plpgsql' VOLATILE;

CREATE TRIGGER LandUseFluxTypeVersionInitializationTrigger7
BEFORE INSERT
ON land_use_flux_type
FOR EACH ROW
EXECUTE PROCEDURE LandUseFluxTypeVersionInitializationFunction();


-- ------------------------------------------------------------
-- Add Version Update Trigger for all update operations
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION LandUseFluxTypeVersionIncrementFunction()
RETURNS "trigger" AS
$$
BEGIN
  New.version:=Old.version + 1;
  Return NEW;
END
$$
LANGUAGE 'plpgsql' VOLATILE;

CREATE TRIGGER LandUseFluxTypeVersionIncrementTrigger
BEFORE UPDATE
ON land_use_flux_type
FOR EACH ROW
EXECUTE PROCEDURE LandUseFluxTypeVersionIncrementFunction();