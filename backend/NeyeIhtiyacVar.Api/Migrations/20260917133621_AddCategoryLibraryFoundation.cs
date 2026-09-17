using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NeyeIhtiyacVar.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCategoryLibraryFoundation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CategoryLibraryWorks",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryServiceId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NormalizedName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CategoryLibraryWorks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CategoryLibraryWorks_CategoryServices_CategoryServiceId",
                        column: x => x.CategoryServiceId,
                        principalTable: "CategoryServices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UnmatchedNeedSearches",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Query = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    NormalizedQuery = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    SearchCount = table.Column<int>(type: "integer", nullable: false),
                    FirstSearchedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastSearchedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "pending"),
                    ResolvedCategoryLibraryPhraseId = table.Column<Guid>(type: "uuid", nullable: true),
                    ResolvedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UnmatchedNeedSearches", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CategoryLibraryPhrases",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CategoryLibraryWorkId = table.Column<Guid>(type: "uuid", nullable: false),
                    Phrase = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    NormalizedPhrase = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CategoryLibraryPhrases", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CategoryLibraryPhrases_CategoryLibraryWorks_CategoryLibrary~",
                        column: x => x.CategoryLibraryWorkId,
                        principalTable: "CategoryLibraryWorks",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CategoryLibraryPhrases_CategoryLibraryWorkId_NormalizedPhra~",
                table: "CategoryLibraryPhrases",
                columns: new[] { "CategoryLibraryWorkId", "NormalizedPhrase" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_CategoryLibraryPhrases_NormalizedPhrase",
                table: "CategoryLibraryPhrases",
                column: "NormalizedPhrase");

            migrationBuilder.CreateIndex(
                name: "IX_CategoryLibraryWorks_CategoryServiceId_NormalizedName",
                table: "CategoryLibraryWorks",
                columns: new[] { "CategoryServiceId", "NormalizedName" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UnmatchedNeedSearches_NormalizedQuery",
                table: "UnmatchedNeedSearches",
                column: "NormalizedQuery",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UnmatchedNeedSearches_Status_LastSearchedAtUtc",
                table: "UnmatchedNeedSearches",
                columns: new[] { "Status", "LastSearchedAtUtc" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CategoryLibraryPhrases");

            migrationBuilder.DropTable(
                name: "UnmatchedNeedSearches");

            migrationBuilder.DropTable(
                name: "CategoryLibraryWorks");
        }
    }
}
