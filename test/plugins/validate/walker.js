import expect from "expect"
import validateHelper from "./validate-helper.js"

describe("validation plugin - semantic - spec walker", function() {
  this.timeout(10 * 1000)
  describe("Type key", () => {
    it.skip("should return an error when \"type\" is an array", () => {
      const spec = {
        paths: {
          "/CoolPath/{id}": {
            responses: {
              "200": {
                schema: {
                  type: ["number", "string"]
                }
              }
            }
          }
        }
      }

      return validateHelper(spec)
        .then(system => {
          const allErrors = system.errSelectors.allErrors().toJS()
          expect(allErrors.length).toEqual(1)
          const firstError = allErrors[0]
          expect(firstError.path).toEqual(["paths", "/CoolPath/{id}", "responses", "200", "schema", "type"])
          expect(firstError.message).toMatch("\"type\" should be a string")
        })
    })

    it("should not return an error when \"type\" is a property name", () => {
      const spec = {
        "definitions": {
          "ApiResponse": {
            "type": "object",
            "properties": {
              "code": {
                "type": "integer",
                "format": "int32"
              },
              "type": {
                "type": "string"
              },
              "message": {
                "type": "string"
              }
            }
          }
        }
      }

      return validateHelper(spec)
        .then(system => {
          let allErrors = system.errSelectors.allErrors().toJS()
          allErrors = allErrors.filter(a => a.level != "warning") // ignore warnings
          expect(allErrors.length).toEqual(0)
        })
    })

    it("should not return an error when \"type\" is a model name", () => {
      const spec = {
        "definitions": {
          "type": {
            "type": "object",
            "properties": {
              "code": {
                "type": "integer",
                "format": "int32"
              },
              "message": {
                "type": "string"
              }
            }
          }
        }
      }

      return validateHelper(spec)
        .then(system => {
          const allErrors = system.errSelectors.allErrors().toJS()
          expect(allErrors.length).toEqual(1)
        })
    })

  })

  describe("Minimums and maximums", () => {

    it("should return an error when minimum is more than maximum", () => {
      const spec = {
        definitions: {
          MyNumber: {
            minimum: 5,
            maximum: 2
          }
        }
      }

      return validateHelper(spec)
        .then(system => {
          let allErrors = system.errSelectors.allErrors().toJS()
          allErrors = allErrors.filter( a => a.level == "error") // Ignore warnings
          expect(allErrors.length).toEqual(1)
          const firstError = allErrors[0]
          expect(firstError.message).toMatch(/.*minimum.*lower.*maximum.*/)
          expect(firstError.path).toEqual(["definitions", "MyNumber", "minimum"])
        })
    })

    it("should not return an error when minimum is less than maximum", () => {
      const spec = {
        definitions: {
          MyNumber: {
            minimum: 1,
            maximum: 2
          }
        }
      }

      return validateHelper(spec)
        .then(system => {
          let allErrors = system.errSelectors.allErrors().toJS()
          allErrors = allErrors.filter(a => a.level === "error") // ignore warnings
          expect(allErrors.length).toEqual(0)
        })
    })

    it("should return an error when minProperties is more than maxProperties", () => {
      const spec = {
        definitions: {
          MyNumber: {
            minProperties: 5,
            maxProperties: 2
          }
        }
      }

      return validateHelper(spec)
        .then(system => {
          let allErrors = system.errSelectors.allErrors().toJS()
          allErrors = allErrors.filter(a => a.level === "error") // ignore warnings
          expect(allErrors.length).toEqual(1)
          const firstError = allErrors[0]
          expect(firstError.path).toEqual(["definitions", "MyNumber", "minProperties"])
          expect(firstError.message).toMatch(/.*minProperties.*lower.*maxProperties.*/)
        })
    })

    it("should not return an error when minProperties is less than maxProperties", () => {
      const spec = {
        definitions: {
          MyNumber: {
            minProperties: "1",
            maxProperties: "2"
          }
        }
      }

      return validateHelper(spec)
        .then(system => {
          let allErrors = system.errSelectors.allErrors().toJS()
          allErrors = allErrors.filter(a => a.level === "error") // ignore warnings
          expect(allErrors.length).toEqual(0)
        })
    })

    it("should return an error when minLength is more than maxLength", () => {
      const spec = {
        definitions: {
          MyNumber: {
            minLength: 5,
            maxLength: 2
          }
        }
      }

      return validateHelper(spec)
        .then(system => {
          let allErrors = system.errSelectors.allErrors().toJS()
          allErrors = allErrors.filter(a => a.level === "error") // ignore warnings
          expect(allErrors.length).toEqual(1)
          const firstError = allErrors[0]
          expect(firstError.path).toEqual(["definitions", "MyNumber", "minLength"])
          expect(firstError.message).toMatch(/.*minLength.*lower.*maxLength.*/)
        })
    })

    it("should not return an error when minLength is less than maxLength", () => {
      const spec = {
        definitions: {
          MyNumber: {
            minLength: "1",
            maxLength: "2"
          }
        }
      }

      return validateHelper(spec)
        .then(system => {
          let allErrors = system.errSelectors.allErrors().toJS()
          allErrors = allErrors.filter(a => a.level === "error") // ignore warnings
          expect(allErrors.length).toEqual(0)
        })
    })

  })

  describe("Refs are restricted in specific areas of a spec", () => {

    describe("Response $refs", () => {
      it.skip("should return a problem for a parameters $ref in a response position", function(){
        const spec = {
          paths: {
            "/CoolPath/{id}": {
              responses: {
                "200": {
                  $ref: "#/parameters/abc"
                }
              }
            }
          }
        }

        return validateHelper(spec)
          .then(system => {
            const allErrors = system.errSelectors.allErrors().toJS()
            expect(allErrors.length).toEqual(1)
            const firstError = allErrors[0]
            expect(firstError.path).toEqual(["paths", "/CoolPath/{id}", "responses", "200", "$ref"])
            // expect(firstError.message).toMatch("")
          })
      })

      // TODO: This poses a problem for our newer validation PR, as it only iterates over the resolved spec.
      // We can look for $$refs, but that may be too fragile.
      // PS: We have a flag in mapSpec, that adds $$refs known as metaPatches
      it.skip("should return a problem for a definitions $ref in a response position", function(){
        const spec = {
          paths: {
            "/CoolPath/{id}": {
              schema: {
                $ref: "#/responses/abc"
              }
            }
          }
        }

        let res = validate({ jsSpec: spec })
        expect(res.errors.length).toEqual(1)
        expect(res.errors[0].path).toEqual(["paths", "/CoolPath/{id}", "schema", "$ref"])
        expect(res.warnings.length).toEqual(0)
      })

      it("should not return a problem for a responses $ref in a response position", function(){
        const spec = {
          paths: {
            "/CoolPath/{id}": {
              responses: {
                "200": {
                  $ref: "#/responses/abc"
                }
              }
            }
          }
        }

        return validateHelper(spec)
          .then(system => {
            const allErrors = system.errSelectors.allErrors().toJS()
            expect(allErrors.length).toEqual(0)
          })
      })
    })

    describe("Schema $refs", () => {
      // See note on resolved vs raw spec
      it.skip("should return a problem for a parameters $ref in a schema position", function(){
        const spec = {
          paths: {
            "/CoolPath/{id}": {
              schema: {
                $ref: "#/parameters/abc"
              }
            }
          }
        }

        let res = validate({ jsSpec: spec })
        expect(res.errors.length).toEqual(1)
        expect(res.errors[0].path).toEqual(["paths", "/CoolPath/{id}", "schema", "$ref"])
        expect(res.warnings.length).toEqual(0)
      })

      it.skip("should return a problem for a responses $ref in a schema position", function(){
        const spec = {
          paths: {
            "/CoolPath/{id}": {
              schema: {
                $ref: "#/responses/abc"
              }
            }
          }
        }

        let res = validate({ jsSpec: spec })
        expect(res.errors.length).toEqual(1)
        expect(res.errors[0].path).toEqual(["paths", "/CoolPath/{id}", "schema", "$ref"])
        expect(res.warnings.length).toEqual(0)
      })

      it("should not return a problem for a definition $ref in a schema position", function(){
        const spec = {
          paths: {
            "/CoolPath/{id}": {
              schema: {
                $ref: "#/definition/abc"
              }
            }
          }
        }

        return validateHelper(spec)
          .then(system => {
            const allErrors = system.errSelectors.allErrors().toJS()
            expect(allErrors.length).toEqual(0)
          })
      })

      it("should not return a problem for a schema property named 'properties'", function(){
        // #492 regression
        const spec = {
          "definitions": {
            "ServicePlan": {
              "description": "New Plan to be added to a service.",
              "properties": {
                "plan_id": {
                  "type": "string",
                  "description": "ID of the new plan from the catalog."
                },
                "parameters": {
                  "$ref": "#/definitions/Parameter"
                },
                "previous_values": {
                  "$ref": "#/definitions/PreviousValues"
                }
              }
            }
          }
        }

        return validateHelper(spec)
          .then(system => {
            let allErrors = system.errSelectors.allErrors().toJS()
            allErrors = allErrors.filter(a => a.level != "warning")
            expect(allErrors.length).toEqual(0)
          })
      })
    })

    describe("Parameter $refs", () => {

      it.skip("should return a problem for a definition $ref in a parameter position", function(){
        const spec = {
          paths: {
            "/CoolPath/{id}": {
              parameters: [{
                $ref: "#/definitions/abc"
              }]
            }
          }
        }

        return validateHelper(spec)
          .then(system => {
            const allErrors = system.errSelectors.allErrors().toJS()
            expect(allErrors.length).toEqual(1)
            const firstError = allErrors[0]
            expect(firstError.path).toEqual(["paths", "/CoolPath/{id}", "parameters", "0", "$ref"])
            expect(firstError.message).toMatch("")
          })
      })

      it.skip("should return a problem for a responses $ref in a parameter position", function(){
        const spec = {
          paths: {
            "/CoolPath/{id}": {
              parameters: [{
                $ref: "#/responses/abc"
              }]
            }
          }
        }

        return validateHelper(spec)
          .then(system => {
            const allErrors = system.errSelectors.allErrors().toJS()
            expect(allErrors.length).toEqual(1)
            const firstError = allErrors[0]
            expect(firstError.path).toEqual(["paths", "/CoolPath/{id}", "parameters", "0", "$ref"])
            expect(firstError.message).toMatch("")
          })
      })

      it("should not return a problem for a parameter $ref in a parameter position", function(){
        const spec = {
          paths: {
            "/CoolPath/{id}": {
              parameters: [{
                $ref: "#/parameters/abc"
              }]
            }
          }
        }

        return validateHelper(spec)
          .then(system => {
            const allErrors = system.errSelectors.allErrors().toJS()
            expect(allErrors.length).toEqual(0)
          })
      })
    })

    describe("Ref siblings", () => {

      it.skip("should return a warning when another property is a sibling of a $ref", () => {
        const spec = {
          paths: {
            "/CoolPath/{id}": {
              schema: {
                $ref: "#/definition/abc",
                description: "My very cool schema"
              }
            }
          }
        }

        return validateHelper(spec)
          .then(system => {
            const allErrors = system.errSelectors.allErrors().toJS()
            expect(allErrors.length).toEqual(1)
            const firstError = allErrors[0]
            expect(firstError.path).toEqual(["paths", "/CoolPath/{id}", "schema", "description"])
            expect(firstError.message).toMatch("")
          })
      })

    })

  })
})