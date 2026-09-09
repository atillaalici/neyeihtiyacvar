using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NeyeIhtiyacVar.Api.Domain;
using NeyeIhtiyacVar.Api.Infrastructure;

namespace NeyeIhtiyacVar.Api.Endpoints;

public static class AdminAuditLogEndpoints
{
    public static IEndpointRouteBuilder MapAdminAuditLogEndpoints(
        this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/audit-logs")
            .RequireAuthorization(policy =>
                policy.RequireRole(UserRole.Admin.ToString()));

        group.MapGet("/", async (
            string? action,
            string? entityType,
            int? page,
            int? pageSize,
            AppDbContext dbContext) =>
        {
            var currentPage = Math.Max(page ?? 1, 1);
            var take = Math.Clamp(pageSize ?? 50, 10, 100);

            var query = dbContext.AdminAuditLogs
                .AsNoTracking()
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(action))
            {
                query = query.Where(x => x.Action == action.Trim());
            }

            if (!string.IsNullOrWhiteSpace(entityType))
            {
                query = query.Where(x => x.EntityType == entityType.Trim());
            }

            var total = await query.CountAsync();

            var items = await query
                .OrderByDescending(x => x.CreatedAtUtc)
                .Skip((currentPage - 1) * take)
                .Take(take)
                .Select(x => new
                {
                    x.Id,
                    x.AdminUserId,
                    x.AdminEmail,
                    x.Action,
                    x.EntityType,
                    x.EntityId,
                    x.EntityName,
                    x.Details,
                    x.CreatedAtUtc
                })
                .ToListAsync();

            return Results.Ok(new
            {
                items,
                total,
                page = currentPage,
                pageSize = take,
                totalPages = (int)Math.Ceiling(total / (double)take)
            });
        });

        return app;
    }

    public static void AddAdminAudit(
        AppDbContext dbContext,
        ClaimsPrincipal principal,
        string action,
        string entityType,
        string? entityId,
        string? entityName,
        string? details = null)
    {
        Guid? adminUserId = null;

        var idValue = principal.FindFirstValue(ClaimTypes.NameIdentifier);

        if (Guid.TryParse(idValue, out var parsedId))
        {
            adminUserId = parsedId;
        }

        var email =
            principal.FindFirstValue(ClaimTypes.Email) ??
            principal.Identity?.Name ??
            "unknown";

        dbContext.AdminAuditLogs.Add(new AdminAuditLog
        {
            AdminUserId = adminUserId,
            AdminEmail = email,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            EntityName = entityName,
            Details = details,
            CreatedAtUtc = DateTime.UtcNow
        });
    }
}