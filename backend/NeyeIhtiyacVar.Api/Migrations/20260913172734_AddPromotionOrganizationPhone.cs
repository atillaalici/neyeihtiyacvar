using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddPromotionOrganizationPhone : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContactPhone",
                table: "PromotionOrganizations",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ContactPhone",
                table: "PromotionOrganizations");
        }
    }
}
