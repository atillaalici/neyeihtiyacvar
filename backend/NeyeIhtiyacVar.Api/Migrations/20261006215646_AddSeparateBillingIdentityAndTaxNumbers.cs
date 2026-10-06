using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddSeparateBillingIdentityAndTaxNumbers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IdentityNumber",
                table: "BillingInformations",
                type: "character varying(11)",
                maxLength: 11,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TaxNumber",
                table: "BillingInformations",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE "BillingInformations"
                SET "IdentityNumber" = "TaxOrIdentityNumber"
                WHERE "BillingType" = 'individual'
                  AND length("TaxOrIdentityNumber") = 11;
                """);

            migrationBuilder.Sql("""
                UPDATE "BillingInformations"
                SET "TaxNumber" = "TaxOrIdentityNumber"
                WHERE "BillingType" = 'corporate'
                  AND length("TaxOrIdentityNumber") = 10;
                """);

            migrationBuilder.DropColumn(
                name: "TaxOrIdentityNumber",
                table: "BillingInformations");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TaxOrIdentityNumber",
                table: "BillingInformations",
                type: "character varying(11)",
                maxLength: 11,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("""
                UPDATE "BillingInformations"
                SET "TaxOrIdentityNumber" =
                    CASE
                        WHEN "BillingType" = 'individual'
                            THEN COALESCE("IdentityNumber", '')
                        WHEN "BillingType" = 'corporate'
                            THEN COALESCE("TaxNumber", '')
                        WHEN "BillingType" = 'sole_proprietorship'
                            THEN COALESCE("IdentityNumber", "TaxNumber", '')
                        ELSE ''
                    END;
                """);

            migrationBuilder.DropColumn(
                name: "IdentityNumber",
                table: "BillingInformations");

            migrationBuilder.DropColumn(
                name: "TaxNumber",
                table: "BillingInformations");
        }
    }
}
